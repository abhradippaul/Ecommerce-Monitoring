def test_list_payments_unauthorized(client):
    response = client.get("/payments")
    assert response.status_code == 401
    assert response.json()["message"] == "Access token missing"


def test_list_payments_invalid_token(client):
    headers = {"Authorization": "Bearer invalid.jwt.token"}
    response = client.get("/payments", headers=headers)
    assert response.status_code == 403
    assert response.json()["message"] == "Invalid or expired token"


def test_list_payments_authorized(client, make_auth_token):
    token = make_auth_token(user_id="user-123", role="buyer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/payments", headers=headers)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Successfully fetched payments"
    assert json_data["data"] == []


def test_create_payment_authorized(client, make_auth_token):
    token = make_auth_token(user_id="user-123", role="buyer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/payments", headers=headers, json={"amount": 100})
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["message"] == "Payment created successfully"
    assert json_data["data"] is None


def test_get_payment_authorized(client, make_auth_token):
    token = make_auth_token(user_id="user-123", role="buyer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/payments/payment-456", headers=headers)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Successfully fetched payment"
    assert json_data["data"] is None


def test_refund_payment_authorized(client, make_auth_token):
    token = make_auth_token(user_id="user-123", role="buyer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/payments/payment-456/refund", headers=headers)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["message"] == "Payment refunded successfully"
    assert json_data["data"] is None


def test_api_v1_payments_prefix(client, make_auth_token):
    token = make_auth_token(user_id="user-123", role="buyer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/payments", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully fetched payments"
