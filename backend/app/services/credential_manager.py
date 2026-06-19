"""
Credential Manager Service with AES-256 Encryption
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import base64
import os
from typing import Optional
from datetime import datetime

from app.core.config import settings


class CredentialManager:
    """Manages secure credential encryption and decryption"""
    
    def __init__(self):
        self._encryption_key = self._derive_key()
        self._fernet = Fernet(self._encryption_key)
    
    def _derive_key(self) -> bytes:
        """Derive encryption key from master password"""
        # In production, use a proper key management service (AWS KMS, Azure Key Vault, etc.)
        master_password = settings.CREDENTIAL_MASTER_KEY.encode()
        salt = settings.CREDENTIAL_SALT.encode()
        
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(master_password))
        return key
    
    def encrypt(self, value: str) -> bytes:
        """Encrypt a credential value"""
        if not value:
            raise ValueError("Cannot encrypt empty value")
        
        encrypted = self._fernet.encrypt(value.encode())
        return encrypted
    
    def decrypt(self, encrypted_value: bytes) -> str:
        """Decrypt a credential value"""
        if not encrypted_value:
            raise ValueError("Cannot decrypt empty value")
        
        decrypted = self._fernet.decrypt(encrypted_value)
        return decrypted.decode()
    
    def mask_value(self, value: str, mask_char: str = "*") -> str:
        """Mask a credential value for display"""
        if not value:
            return ""
        
        if len(value) <= 4:
            return mask_char * len(value)
        
        # Show first and last 2 characters
        return value[:2] + (mask_char * (len(value) - 4)) + value[-2:]
    
    def generate_key_id(self) -> str:
        """Generate a unique key identifier for key rotation"""
        return f"key_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{os.urandom(4).hex()}"


class SensitiveDataDetector:
    """Detects sensitive data in form fields and inputs"""
    
    # Patterns that indicate sensitive fields
    SENSITIVE_PATTERNS = {
        "password": ["password", "passwd", "pwd", "pass"],
        "secret": ["secret", "token", "apikey", "api_key", "client_secret"],
        "otp": ["otp", "2fa", "mfa", "verification_code", "verify"],
        "pin": ["pin", "pincode"],
        "credit_card": ["card", "credit", "ccn", "cardnumber"],
        "bank": ["bank", "account", "routing"],
        "ssn": ["ssn", "social_security"],
    }
    
    @classmethod
    def is_sensitive_field(cls, selector: str, field_name: str = "", field_type: str = "") -> tuple[bool, str]:
        """
        Check if a field is sensitive
        Returns: (is_sensitive, credential_type)
        """
        # Check input type
        if field_type == "password":
            return True, "password"
        
        # Combine selector and field name for checking
        combined = f"{selector} {field_name}".lower()
        
        # Check against patterns
        for cred_type, patterns in cls.SENSITIVE_PATTERNS.items():
            for pattern in patterns:
                if pattern in combined:
                    return True, cred_type
        
        return False, ""
    
    @classmethod
    def detect_login_form(cls, actions: list[dict]) -> Optional[dict]:
        """
        Detect if recorded actions contain a login form
        Returns login form structure if detected
        """
        username_action = None
        password_action = None
        submit_action = None
        
        for i, action in enumerate(actions):
            action_type = action.get("type", "")
            selector = action.get("selector", "").lower()
            
            # Detect username field
            if action_type in ["type", "fill"] and any(p in selector for p in ["user", "email", "login"]):
                username_action = action
            
            # Detect password field
            elif action_type in ["type", "fill"] and any(p in selector for p in ["password", "passwd", "pwd"]):
                password_action = action
            
            # Detect submit button
            elif action_type == "click" and any(p in selector for p in ["submit", "login", "signin", "sign-in"]):
                submit_action = action
        
        # If we found username and password fields, it's likely a login form
        if username_action and password_action:
            return {
                "detected": True,
                "username_field": username_action.get("selector"),
                "password_field": password_action.get("selector"),
                "submit_button": submit_action.get("selector") if submit_action else None,
                "suggest_block": True,
                "block_name": "Login",
                "block_inputs": ["USERNAME", "PASSWORD"]
            }
        
        return None
    
    @classmethod
    def mask_action_value(cls, action: dict) -> dict:
        """
        Mask sensitive values in an action
        Returns modified action with masked value and variable placeholder
        """
        selector = action.get("selector", "")
        value = action.get("value", "")
        
        is_sensitive, cred_type = cls.is_sensitive_field(selector)
        
        if is_sensitive and value:
            # Generate variable name
            var_name = cred_type.upper()
            if cred_type == "password":
                var_name = "PASSWORD"
            elif cred_type == "secret":
                var_name = "API_KEY"
            
            # Return masked action
            return {
                **action,
                "value": f"{{{{{var_name}}}}}",  # {{VAR_NAME}}
                "original_value": value,  # Store for credential creation
                "sensitive": True,
                "credential_type": cred_type,
                "variable_name": var_name
            }
        
        return action


class ScreenshotMasker:
    """Masks sensitive data in screenshots"""
    
    @staticmethod
    def should_mask_screenshot(node_config: dict) -> bool:
        """Check if screenshot should be masked"""
        return node_config.get("sensitive", False) or node_config.get("is_sensitive", False)
    
    @staticmethod
    def get_mask_regions(page_elements: list[dict]) -> list[dict]:
        """
        Get regions to mask in screenshot
        Returns list of bounding boxes
        """
        mask_regions = []
        
        for element in page_elements:
            if element.get("sensitive", False):
                mask_regions.append({
                    "x": element.get("x", 0),
                    "y": element.get("y", 0),
                    "width": element.get("width", 0),
                    "height": element.get("height", 0),
                    "mask_type": "black_box"  # or "blur", "asterisks"
                })
        
        return mask_regions


# Made with Bob