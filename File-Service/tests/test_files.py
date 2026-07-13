from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_generate_upload_presigned_url():
    payload = {"file_name": "my_avatar.png", "role": "buyer"}
    mock_url = "https://mock-s3-bucket.s3.amazonaws.com/upload-url"

    with patch(
        "app.services.s3_service.generate_upload_presigned_url", return_value=mock_url
    ) as mock_gen:
        response = client.post("/api/v1/files/presigned-url/upload", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "file_name" in data
        assert data["upload_url"] == mock_url
        assert data["file_name"].startswith("buyer/avatar/images/")
        assert data["file_name"].endswith(".png")
        mock_gen.assert_called_once()


def test_generate_presigned_preview_url():
    payload = {"file_name": "buyer/avatar/images/some-uuid.png"}
    mock_url = "https://mock-s3-bucket.s3.amazonaws.com/preview-url"

    with patch(
        "app.services.s3_service.generate_presigned_preview_url", return_value=mock_url
    ) as mock_gen:
        response = client.post("/api/v1/files/presigned-url/preview", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == payload["file_name"]
        assert data["preview_url"] == mock_url
        mock_gen.assert_called_once_with(payload["file_name"])


def test_generate_presigned_preview_url_missing_file_name():
    payload = {"file_name": ""}
    response = client.post("/api/v1/files/presigned-url/preview", json=payload)
    assert response.status_code == 400


def test_delete_file():
    payload = {"file_name": "buyer/avatar/images/some-uuid.png"}

    with patch("app.services.s3_service.delete_file", return_value=None) as mock_delete:
        response = client.request("DELETE", "/api/v1/files/", json=payload)

        assert response.status_code == 204
        assert response.text == ""
        mock_delete.assert_called_once_with(payload["file_name"])
