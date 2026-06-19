"""
Workflow Generator Service
Converts recorded actions into complete workflow with nodes and edges
"""
from typing import Dict, List, Any
from datetime import datetime
import uuid

from app.db.models import NodeType


class WorkflowGeneratorService:
    """Generate workflows from recorded actions"""
    
    @staticmethod
    def generate_from_actions(
        actions: List[Dict[str, Any]],
        workflow_name: str = "Recorded Workflow",
        description: str | None = None
    ) -> Dict[str, Any]:
        """
        Generate complete workflow with nodes and edges from actions
        
        Args:
            actions: List of normalized actions
            workflow_name: Name for the workflow
            description: Optional description
            
        Returns:
            Complete workflow dict with nodes and edges
        """
        nodes = []
        edges = []
        
        # Generate nodes from actions
        for idx, action in enumerate(actions):
            node = WorkflowGeneratorService._action_to_node(action, idx)
            nodes.append(node)
            
            # Create edge to previous node
            if idx > 0:
                edge = WorkflowGeneratorService._create_edge(
                    nodes[idx - 1]["node_id"],
                    node["node_id"],
                    idx
                )
                edges.append(edge)
        
        # Apply smart positioning
        nodes = WorkflowGeneratorService._apply_smart_positioning(nodes)
        
        # Generate metadata
        metadata = {
            "generated_at": datetime.utcnow().isoformat(),
            "action_count": len(actions),
            "node_count": len(nodes),
            "edge_count": len(edges),
            "generator_version": "2.0"
        }
        
        return {
            "name": workflow_name,
            "description": description or f"Workflow generated from {len(actions)} recorded actions",
            "nodes": nodes,
            "edges": edges,
            "metadata": metadata
        }
    
    @staticmethod
    def _action_to_node(action: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Convert action to workflow node"""
        action_type = action.get("type", "unknown")
        node_id = action.get("id") or f"node_{index}"
        
        # Map action type to node type
        node_type_map = {
            "navigate": NodeType.OPEN_URL,
            "click": NodeType.CLICK,
            "type": NodeType.TYPE,
            "check": NodeType.CLICK,
            "uncheck": NodeType.CLICK,
            "select": NodeType.SELECT,
            "hover": NodeType.HOVER,
            "upload": NodeType.UPLOAD_FILE,
            "double_click": NodeType.CLICK,
            "press_key": NodeType.TYPE,
        }
        
        node_type = node_type_map.get(action_type, NodeType.CLICK)
        
        # Build config based on action type
        config = {}
        if action_type == "navigate":
            config["url"] = action.get("url", "")
            label = f"Navigate to {action.get('url', 'URL')}"
        elif action_type in ["click", "double_click"]:
            config["selector"] = action.get("selector", "")
            config["action"] = action_type
            label = f"Click {action.get('selector', 'element')}"
        elif action_type in ["type", "press_key"]:
            config["selector"] = action.get("selector", "")
            config["value"] = action.get("value", "")
            label = f"Type '{action.get('value', '')}' into {action.get('selector', 'field')}"
        elif action_type in ["check", "uncheck"]:
            config["selector"] = action.get("selector", "")
            config["action"] = action_type
            label = f"{action_type.capitalize()} {action.get('selector', 'checkbox')}"
        elif action_type == "select":
            config["selector"] = action.get("selector", "")
            config["value"] = action.get("value", "")
            label = f"Select '{action.get('value', '')}' in {action.get('selector', 'dropdown')}"
        elif action_type == "hover":
            config["selector"] = action.get("selector", "")
            label = f"Hover over {action.get('selector', 'element')}"
        elif action_type == "upload":
            config["selector"] = action.get("selector", "")
            label = f"Upload file to {action.get('selector', 'input')}"
        else:
            config["selector"] = action.get("selector", "")
            label = f"Action {index + 1}"
        
        # Add timeout
        config["timeout"] = 30000
        
        return {
            "node_id": node_id,
            "node_type": node_type.value,
            "label": label,
            "position_x": 100,  # Will be updated by smart positioning
            "position_y": 100 + (index * 100),
            "config": config,
            "metadata": {
                "original_action": action,
                "generated_at": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def _create_edge(
        source_node_id: str,
        target_node_id: str,
        index: int
    ) -> Dict[str, Any]:
        """Create edge between nodes"""
        return {
            "edge_id": f"edge_{index}",
            "source_node_id": source_node_id,
            "target_node_id": target_node_id,
            "source_handle": None,
            "target_handle": None,
            "config": {},
            "metadata": {
                "generated_at": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def _apply_smart_positioning(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply smart positioning to nodes for better visual layout
        
        Strategy:
        - Vertical flow with consistent spacing
        - Group related actions
        - Add horizontal offset for branches
        """
        base_x = 250
        base_y = 100
        vertical_spacing = 120
        horizontal_spacing = 300
        
        current_column = 0
        nodes_in_column = 0
        max_nodes_per_column = 8
        
        for idx, node in enumerate(nodes):
            # Check if we need to start a new column
            if nodes_in_column >= max_nodes_per_column:
                current_column += 1
                nodes_in_column = 0
            
            # Calculate position
            x = base_x + (current_column * horizontal_spacing)
            y = base_y + (nodes_in_column * vertical_spacing)
            
            node["position_x"] = x
            node["position_y"] = y
            
            nodes_in_column += 1
        
        return nodes
    
    @staticmethod
    def group_actions_by_page(actions: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Group actions by page/URL for better organization
        
        Args:
            actions: List of actions
            
        Returns:
            List of action groups
        """
        groups = []
        current_group = []
        current_url = None
        
        for action in actions:
            if action.get("type") == "navigate":
                # Start new group on navigation
                if current_group:
                    groups.append(current_group)
                current_group = [action]
                current_url = action.get("url")
            else:
                current_group.append(action)
        
        # Add last group
        if current_group:
            groups.append(current_group)
        
        return groups
    
    @staticmethod
    def generate_workflow_with_groups(
        actions: List[Dict[str, Any]],
        workflow_name: str = "Recorded Workflow"
    ) -> Dict[str, Any]:
        """
        Generate workflow with grouped actions for better organization
        
        Args:
            actions: List of actions
            workflow_name: Name for the workflow
            
        Returns:
            Workflow with grouped nodes
        """
        groups = WorkflowGeneratorService.group_actions_by_page(actions)
        
        all_nodes = []
        all_edges = []
        node_counter = 0
        
        for group_idx, group in enumerate(groups):
            # Generate nodes for this group
            for action_idx, action in enumerate(group):
                node = WorkflowGeneratorService._action_to_node(action, node_counter)
                
                # Adjust position based on group
                node["position_x"] = 250 + (group_idx * 400)
                node["position_y"] = 100 + (action_idx * 120)
                
                all_nodes.append(node)
                
                # Create edge to previous node
                if node_counter > 0:
                    edge = WorkflowGeneratorService._create_edge(
                        all_nodes[node_counter - 1]["node_id"],
                        node["node_id"],
                        node_counter
                    )
                    all_edges.append(edge)
                
                node_counter += 1
        
        metadata = {
            "generated_at": datetime.utcnow().isoformat(),
            "action_count": len(actions),
            "node_count": len(all_nodes),
            "edge_count": len(all_edges),
            "group_count": len(groups),
            "generator_version": "2.0",
            "layout": "grouped_by_page"
        }
        
        return {
            "name": workflow_name,
            "description": f"Workflow with {len(groups)} page groups and {len(actions)} actions",
            "nodes": all_nodes,
            "edges": all_edges,
            "metadata": metadata
        }


# Made with Bob