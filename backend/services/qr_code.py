import json
import base64


def generate_qr_code_data(event_name: str, event_id: str, access_pin: str) -> str:
    """
    Generate QR code data string for event access.
    The QR code contains encoded JSON with event details.
    The mobile app will scan this and use it to join the event.
    """
    qr_payload = {
        "app": "stagandhen",
        "version": 1,
        "event_id": event_id,
        "event_name": event_name,
        "pin": access_pin
    }
    
    # Encode as base64 for cleaner QR code
    json_str = json.dumps(qr_payload)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    
    # Return a URL-like format that the app can recognize
    return f"stagandhen://join?data={encoded}"


def decode_qr_code_data(qr_string: str) -> dict:
    """
    Decode QR code data string back to event details.
    """
    if not qr_string.startswith("stagandhen://join?data="):
        raise ValueError("Invalid QR code format")
    
    encoded = qr_string.split("data=")[1]
    json_str = base64.urlsafe_b64decode(encoded.encode()).decode()
    
    return json.loads(json_str)
