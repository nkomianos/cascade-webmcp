'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('Cascade canvas failed to render', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state">
          <strong>The map view hit a rendering error.</strong>
          <p>Your decision data is safe. Switch to List view, or reload to try the map again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
