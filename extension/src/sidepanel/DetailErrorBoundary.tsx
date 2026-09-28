import { Component, type ReactNode } from "react";

interface DetailErrorBoundaryProps {
  children?: ReactNode;
  onBack: () => void;
  onReload: () => void;
}

interface DetailErrorBoundaryState {
  failed: boolean;
}

export default class DetailErrorBoundary extends Component<
  DetailErrorBoundaryProps,
  DetailErrorBoundaryState
> {
  state: DetailErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): DetailErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        role="alert"
        style={{ padding: 24, textAlign: "center", color: "#c62828" }}
      >
        <p>Could not load this screen.</p>
        <button onClick={this.props.onBack}>Back to search</button>
        <button onClick={this.props.onReload}>Reload extension</button>
      </div>
    );
  }
}
