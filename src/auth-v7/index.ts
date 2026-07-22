export { AuthProvider, useAuthV7, useOptionalAuthV7 } from "./AuthProvider";
export { RequireAuth } from "./RequireAuth";
export { RequirePermission } from "./RequirePermission";
export {
  signInWithPassword,
  signOutAuth,
  resetPasswordForEmail,
  mapAuthError,
  getInitialSession,
  subscribeAuth,
} from "./authService";
export { loadAuthV7Profile, ProfileLoadError } from "./userProfileService";
export {
  hasPermission,
  canAccessRegional,
  canAccessBandeira,
  canAccessLoja,
  canViewRuptura,
  canProcessRuptura,
  canAdminUsuarios,
  canViewDrive,
  canValidateDrive,
  canProcessDrive,
  isGerenteLoja,
  gerenteCanOnlyViewStore,
  type PermissionContext,
} from "./permissionService";
export {
  evaluateProfileGate,
  buildPermissionHelpers,
  mapNivelToLegacyMenu,
  perfilV7ToLegacyUsuario,
  toPermissionContext,
} from "./authProfileUtils";
export {
  AUTH_V7_MESSAGES,
  type AuthV7ContextValue,
  type AuthV7ProfileBundle,
  type NivelV7,
  type UsuarioPerfilV7,
} from "./authV7Types";
export {
  FILTRO_BANDEIRA_TODAS,
  FILTRO_LOJA_TODAS,
  type CatalogoBandeira,
  type CatalogoLoja,
  type CatalogoRegional,
  type CatalogoLojaRow,
  type FiltroRegionalBandeiraLojaValores,
} from "./catalogoLojasTypes";
export {
  fetchCatalogoLojas,
  filtrarCatalogoPorPermissoes,
  formatLojaLabel,
  listarBandeirasDoCatalogo,
  listarLojasDoCatalogo,
  listarRegionaisDoCatalogo,
  normalizarFiltroCascade,
  invalidateCatalogoLojasCache,
} from "./catalogoLojasService";
export { useCatalogoLojas } from "./hooks/useCatalogoLojas";
