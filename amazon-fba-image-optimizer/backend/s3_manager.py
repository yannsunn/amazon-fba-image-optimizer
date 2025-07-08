import boto3
import json
import zipfile
from io import BytesIO
import os
from typing import Dict, List
import logging
from botocore.exceptions import ClientError, NoCredentialsError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class S3Manager:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            # バケットの存在確認
            self._ensure_bucket_exists()
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"S3 initialization error: {str(e)}")
            raise
    
    def _ensure_bucket_exists(self):
        """バケットの存在確認と作成"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket {self.bucket_name} exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.info(f"Creating bucket {self.bucket_name}")
                try:
                    self.s3_client.create_bucket(
                        Bucket=self.bucket_name,
                        CreateBucketConfiguration={
                            'LocationConstraint': os.getenv('AWS_REGION', 'us-east-1')
                        }
                    )
                except ClientError as create_error:
                    if create_error.response['Error']['Code'] == 'BucketAlreadyExists':
                        logger.info(f"Bucket {self.bucket_name} already exists")
                    else:
                        raise
            else:
                raise
    
    def upload_file(self, file_path: str, s3_key: str) -> str:
        """ファイルをS3にアップロード"""
        try:
            self.s3_client.upload_file(
                file_path, 
                self.bucket_name, 
                s3_key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'ACL': 'public-read'
                }
            )
            
            # 公開URLを生成
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            logger.info(f"File uploaded: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Upload error: {str(e)}")
            raise
    
    def save_json(self, s3_key: str, data: Dict):
        """JSONデータをS3に保存"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json.dumps(data, indent=2),
                ContentType='application/json'
            )
            logger.info(f"JSON saved: {s3_key}")
        except ClientError as e:
            logger.error(f"JSON save error: {str(e)}")
            raise
    
    def get_json(self, s3_key: str) -> Dict:
        """S3からJSONデータを取得"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            data = json.loads(response['Body'].read())
            logger.info(f"JSON loaded: {s3_key}")
            return data
        except ClientError as e:
            logger.error(f"JSON load error: {str(e)}")
            raise
    
    def create_batch_download(self, batch_id: str) -> str:
        """バッチ内の全画像をZIPファイルにしてダウンロードURL生成"""
        try:
            # バッチ内の全画像を取得
            prefix = f"batches/{batch_id}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                raise ValueError(f"No files found for batch {batch_id}")
            
            # メモリ上でZIPファイルを作成
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for obj in response['Contents']:
                    if obj['Key'].endswith('.jpg') or obj['Key'].endswith('.jpeg'):
                        try:
                            # S3から画像を取得
                            file_response = self.s3_client.get_object(
                                Bucket=self.bucket_name,
                                Key=obj['Key']
                            )
                            
                            # ファイル名を生成
                            filename = obj['Key'].split('/')[-1]
                            
                            # ZIPに追加
                            zip_file.writestr(filename, file_response['Body'].read())
                            logger.info(f"Added to ZIP: {filename}")
                            
                        except ClientError as e:
                            logger.error(f"Error reading file {obj['Key']}: {str(e)}")
                            continue
            
            # ZIPファイルをS3にアップロード
            zip_key = f"downloads/{batch_id}.zip"
            zip_buffer.seek(0)
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=zip_key,
                Body=zip_buffer.getvalue(),
                ContentType='application/zip'
            )
            
            # 署名付きURLを生成（1時間有効）
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': zip_key},
                ExpiresIn=3600
            )
            
            logger.info(f"ZIP file created: {zip_key}")
            return url
            
        except Exception as e:
            logger.error(f"Batch download error: {str(e)}")
            raise
    
    def delete_batch(self, batch_id: str):
        """バッチ関連のファイルをすべて削除"""
        try:
            # バッチ関連のファイルを取得
            prefixes = [f"batches/{batch_id}/", f"downloads/{batch_id}.zip"]
            
            for prefix in prefixes:
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=prefix
                )
                
                if 'Contents' in response:
                    delete_objects = [{'Key': obj['Key']} for obj in response['Contents']]
                    
                    if delete_objects:
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': delete_objects}
                        )
                        logger.info(f"Deleted {len(delete_objects)} files for batch {batch_id}")
                        
        except ClientError as e:
            logger.error(f"Batch deletion error: {str(e)}")
            raise
    
    def list_batches(self) -> List[Dict]:
        """すべてのバッチ一覧を取得"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix="batches/",
                Delimiter="/"
            )
            
            batches = []
            if 'CommonPrefixes' in response:
                for prefix in response['CommonPrefixes']:
                    batch_id = prefix['Prefix'].split('/')[-2]
                    try:
                        batch_info = self.get_json(f"batches/{batch_id}/batch_info.json")
                        batches.append(batch_info)
                    except:
                        continue
            
            return batches
            
        except ClientError as e:
            logger.error(f"List batches error: {str(e)}")
            raise