"""
Database Models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Boolean, LargeBinary, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.db.database import Base

# Use JSON for both SQLite and PostgreSQL
JSON_TYPE = JSON


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeType(str, enum.Enum):
    # Browser Actions
    CLICK = "CLICK"
    TYPE = "TYPE"
    SELECT = "SELECT"
    HOVER = "HOVER"
    UPLOAD_FILE = "UPLOAD_FILE"
    
    # Navigation
    OPEN_URL = "OPEN_URL"
    BACK = "BACK"
    REFRESH = "REFRESH"
    
    # Control Flow
    DELAY = "DELAY"
    IF_CONDITION = "IF_CONDITION"
    LOOP = "LOOP"
    
    # Data
    VARIABLE = "VARIABLE"
    API_REQUEST = "API_REQUEST"
    
    # Reusable
    BLOCK = "BLOCK"


class CredentialType(str, enum.Enum):
    USERNAME = "username"
    PASSWORD = "password"
    API_KEY = "api_key"
    TOKEN = "token"
    SECRET = "secret"
    OTP = "otp"
    PIN = "pin"
    CREDIT_CARD = "credit_card"
    BANK_ACCOUNT = "bank_account"
    CUSTOM = "custom"


class AuditAction(str, enum.Enum):
    CREDENTIAL_CREATED = "credential_created"
    CREDENTIAL_UPDATED = "credential_updated"
    CREDENTIAL_DELETED = "credential_deleted"
    CREDENTIAL_USED = "credential_used"
    CREDENTIAL_VIEWED = "credential_viewed"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.DEVELOPER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="owner")
    workflows = relationship("Workflow", back_populates="creator")
    credentials = relationship("Credential", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")
    blocks = relationship("Block", back_populates="creator")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    workflows = relationship("Workflow", back_populates="project")


class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="workflows")
    creator = relationship("User", back_populates="workflows")
    nodes = relationship("WorkflowNode", back_populates="workflow", cascade="all, delete-orphan")
    edges = relationship("WorkflowEdge", back_populates="workflow", cascade="all, delete-orphan")
    runs = relationship("WorkflowRun", back_populates="workflow")
    variables = relationship("WorkflowVariable", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    node_id = Column(String, nullable=False)  # UUID for React Flow
    node_type = Column(SQLEnum(NodeType), nullable=False)
    label = Column(String, nullable=False)
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    config = Column(JSON_TYPE, default={})
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="nodes")


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    edge_id = Column(String, nullable=False)  # UUID for React Flow
    source_node_id = Column(String, nullable=False)
    target_node_id = Column(String, nullable=False)
    source_handle = Column(String)
    target_handle = Column(String)
    config = Column(JSON_TYPE, default={})
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="edges")


class WorkflowVariable(Base):
    __tablename__ = "workflow_variables"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    name = Column(String, nullable=False)
    variable_type = Column(String, default="string")  # string, number, boolean, credential
    default_value = Column(Text)
    is_sensitive = Column(Boolean, default=False)
    credential_id = Column(Integer, ForeignKey("credentials.id"), nullable=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="variables")
    credential = relationship("Credential")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    run_id = Column(String, unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.ACTIVE)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)
    error_message = Column(Text)
    logs = Column(JSON_TYPE, default=[])
    result = Column(JSON_TYPE, default={})
    meta_data = Column(JSON_TYPE, default={})
    
    # Relationships
    workflow = relationship("Workflow", back_populates="runs")
    screenshots = relationship("Screenshot", back_populates="run", cascade="all, delete-orphan")
    workflow_logs = relationship("WorkflowLog", back_populates="run", cascade="all, delete-orphan")


class Screenshot(Base):
    __tablename__ = "screenshots"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False)
    node_id = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    is_masked = Column(Boolean, default=False)
    captured_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    run = relationship("WorkflowRun", back_populates="screenshots")


class Block(Base):
    __tablename__ = "blocks"
    
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    workflow_definition = Column(JSON_TYPE, nullable=False)
    inputs = Column(JSON_TYPE, default=[])
    outputs = Column(JSON_TYPE, default=[])
    version = Column(String, default="1.0.0")
    current_version = Column(Integer, default=1)
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="blocks")
    versions = relationship("BlockVersion", back_populates="block", cascade="all, delete-orphan")


class BlockVersion(Base):
    __tablename__ = "block_versions"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False)
    version = Column(Integer, nullable=False)
    nodes = Column(JSON_TYPE, default=[])
    edges = Column(JSON_TYPE, default=[])
    inputs = Column(JSON_TYPE, default=[])
    outputs = Column(JSON_TYPE, default=[])
    changelog = Column(String)
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    block = relationship("Block", back_populates="versions")


class CredentialGroup(Base):
    __tablename__ = "credential_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    credentials = relationship("Credential", back_populates="group")


class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    credential_type = Column(SQLEnum(CredentialType), nullable=False)
    encrypted_value = Column(LargeBinary, nullable=False)  # AES-256 encrypted
    encryption_key_id = Column(String, nullable=False)  # Key identifier for rotation
    group_id = Column(Integer, ForeignKey("credential_groups.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text)
    meta_data = Column(JSON_TYPE, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime)
    
    # Relationships
    owner = relationship("User", back_populates="credentials")
    group = relationship("CredentialGroup", back_populates="credentials")
    audit_logs = relationship("AuditLog", back_populates="credential")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    credential_id = Column(Integer, ForeignKey("credentials.id"), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    resource_type = Column(String)  # workflow, credential, etc.
    resource_id = Column(Integer)
    details = Column(JSON_TYPE, default={})
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    credential = relationship("Credential", back_populates="audit_logs")


class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("workflow_runs.id"), nullable=False)
    node_id = Column(String)
    level = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    screenshot_path = Column(String)
    meta_data = Column(JSON_TYPE, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("WorkflowRun", back_populates="workflow_logs")

# Made with Bob
