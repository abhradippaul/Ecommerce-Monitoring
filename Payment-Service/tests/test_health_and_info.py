def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Successfully fetched health status"
    assert json_data["data"]["status"] == "UP"
    assert "timestamp" in json_data["data"]
    assert "uptime" in json_data["data"]


def test_health_trailing_slash(client):
    response = client.get("/health/")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["data"]["status"] == "UP"


def test_info_endpoint(client):
    response = client.get("/info")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Successfully fetched application info"
    assert json_data["data"]["name"] == "payment-service"
    assert json_data["data"]["version"] == "1.0.0"
    assert json_data["data"]["environment"] == "test"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Payment Service is running"
