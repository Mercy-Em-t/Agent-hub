# engines/animation/cinematic_graph.py
from datetime import datetime

class CinematicNode:
    """
    Represents a decision point, film sequence, or shot group in a branching cinematic graph.
    """
    def __init__(self, name, description=""):
        self.name = name
        self.description = description
        self.next_branches = []  # List of tuples (condition_lambda_or_string, CinematicNode)
        self.actions = []        # List of functions/actions to execute

    def add_branch(self, next_node, condition=None):
        """
        Adds a branching link to another node with an optional condition.
        Condition can be a string key or a lambda function evaluating the context.
        """
        self.next_branches.append((condition, next_node))

    def add_action(self, action_func):
        """
        Registers an execution action/callback to trigger when entering this node.
        """
        self.actions.append(action_func)

    def to_dict(self):
        return {
            "name": self.name,
            "description": self.description,
            "branches": [b[1].name for b in self.next_branches]
        }


class CinematicGraphEngine:
    """
    Executes and navigates the branching cinematic graph based on director parameters and scene contexts.
    """
    def __init__(self):
        self.diary = []
        self.execution_path = []
        self.log("CinematicGraphEngine active.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "CINEMATIC_GRAPH", "message": message})
        print(f"[{timestamp}] [CinematicGraphEngine] {message}")

    def run_graph(self, node, context=None):
        """
        Recursively traverses the graph starting from the given node,
        evaluating conditions dynamically against the runtime context.
        """
        if context is None:
            context = {}

        self.log(f"Entering Node: '{node.name}' - {node.description}")
        self.execution_path.append(node.name)

        # Execute all actions associated with the node
        for action in node.actions:
            try:
                action(context)
            except Exception as e:
                self.log(f"Error executing action on node '{node.name}': {e}")

        # Evaluate and decide which branching path to take
        chosen_branch = None
        for condition, next_node in node.next_branches:
            if condition is None:
                # Default fallback branch
                chosen_branch = next_node
                break
            elif callable(condition):
                # Lambda or function condition
                if condition(context):
                    chosen_branch = next_node
                    break
            elif isinstance(condition, str):
                # String matching on context keys
                key, val = condition.split("=") if "=" in condition else (condition, True)
                if str(context.get(key.strip())) == str(val.strip()):
                    chosen_branch = next_node
                    break

        if chosen_branch:
            self.log(f"Branching from '{node.name}' -> '{chosen_branch.name}'")
            self.run_graph(chosen_branch, context)
        else:
            self.log(f"Reached terminal cinematic node: '{node.name}'. Narrative flow finished.")

        return self.execution_path
