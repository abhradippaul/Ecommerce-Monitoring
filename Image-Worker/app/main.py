from PIL import Image
import boto3
import os
import io
from botocore.exceptions import NoCredentialsError, ClientError

s3_client = boto3.client('s3')

BUCKET_NAME = 'ecommerce-monitoring-dev-s3-bucket'
OBJECT_KEY = 'buyer/avatar/images/1878a159-1d21-4378-8507-4693c478ed8b.png'
LOCAL_FILE = 'test.png'

def download_image_from_s3(bucket_name, s3_object_key, local_file_path):
    try:
        print(f"Fetching {s3_object_key} from bucket {bucket_name}...")
        
        # 1. Download the file directly into a memory buffer instead of disk
        file_stream = io.BytesIO()
        s3_client.download_fileobj(bucket_name, s3_object_key, file_stream)
        file_stream.seek(0) # Rewind the buffer pointer to the beginning
        
        # 2. Open the image using Pillow
        print("Converting image to WebP...")
        image = Image.open(file_stream)
        
        # 3. Ensure the local file extension ends with .webp
        base_path, _ = os.path.splitext(local_file_path)
        webp_file_path = f"{base_path}.webp"
        
        # 4. Save as WebP with optimization
        # 'quality=80' is the sweet spot for web optimization (good quality, small size)
        image.save(webp_file_path, format="WEBP", quality=80)
        
        print(f"Successfully optimized and saved to: {webp_file_path}")
        
    except NoCredentialsError:
        print("Credentials not available. Please configure your AWS credentials.")
    except ClientError as e:
        print(f"An AWS error occurred: {e}")
    except Exception as e:
        print(f"An error occurred during conversion: {e}")

def convert_resolution(input_path, output_path, target_width):
    """
    Changes the pixel resolution of an image while preserving its aspect ratio.
    """
    try:
        # Open the image file
        with Image.open(input_path) as img:
            # Get original dimensions
            original_width, original_height = img.size
            
            # Calculate aspect ratio
            aspect_ratio = original_height / original_width
            
            # Calculate new height based on the target width
            target_height = int(target_width * aspect_ratio)
            
            print(f"Resizing from {original_width}x{original_height} to {target_width}x{target_height}...")
            
            # Resize the image using high-quality resampling (LANCZOS)
            resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            # Save the resized image
            resized_img.save(output_path)
            print("Image saved successfully.")
            
    except FileNotFoundError:
        print(f"Error: The file at '{input_path}' could not be found.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def upload_image_to_s3(bucket_name: str, s3_object_key: str, local_file_path: str):
    try:
        print(f"Fetching {s3_object_key} from bucket {bucket_name}...")
        
        # 1. Download the file directly into a memory buffer instead of disk
        file_stream = io.BytesIO()
        s3_client.download_fileobj(bucket_name, s3_object_key, file_stream)
        file_stream.seek(0) # Rewind the buffer pointer to the beginning
        
        # 2. Open the image using Pillow
        print("Converting image to WebP...")
        image = Image.open(file_stream)
        
        # 3. Ensure the local file extension ends with .webp
        base_path, _ = os.path.splitext(local_file_path)
        webp_file_path = f"{base_path}.webp"
        
        # 4. Save as WebP with optimization
        # 'quality=80' is the sweet spot for web optimization (good quality, small size)
        image.save(webp_file_path, format="WEBP", quality=80)
        
        print(f"Successfully optimized and saved to: {webp_file_path}")
        
    except NoCredentialsError:
        print("Credentials not available. Please configure your AWS credentials.")
    except ClientError as e:
        print(f"An AWS error occurred: {e}")
    except Exception as e:
        print(f"An error occurred during conversion: {e}")

if __name__ == "__main__":
    source_image = "input.png"       
    destination_image = "output.png"
    
    # Define the new width you want (e.g., 800 pixels wide)
    # The height will scale automatically to match
    target_width = 100 
    download_image_from_s3(bucket_name=BUCKET_NAME, s3_object_key=OBJECT_KEY, local_file_path=LOCAL_FILE)
    # convert_resolution(source_image, destination_image, target_width)