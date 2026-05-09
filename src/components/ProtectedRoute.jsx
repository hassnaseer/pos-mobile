import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import NoAccessScreen from './NoAccessScreen';
import { getModuleDisplayName } from '../utils/permissions';

/**
 * @param {Object} props
 * @param {React.Component} props.component - The component to render if access is granted
 * @param {string} props.moduleName - The module name to check access for
 * @param {Object} props - All other props are passed to the component
 *
 * @example
 */
const ProtectedRoute = ({ component: Component, moduleName, ...rest }) => {
  const { hasModule, isClient } = usePermissions();

  // Client role bypasses all permission checks
  if (isClient()) {
    return <Component {...rest} />;
  }

  // Check if user has access to the module
  const hasAccess = hasModule(moduleName);

  if (!hasAccess) {
    return (
      <NoAccessScreen
        moduleName={getModuleDisplayName(moduleName)}
        navigation={rest.navigation}
      />
    );
  }

  return <Component {...rest} />;
};

export default ProtectedRoute;
