import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <p className="text-sm font-medium text-muted-foreground">Erreur 404</p>
    <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
    <p className="text-sm text-muted-foreground">La page que vous cherchez n'existe pas ou a été déplacée.</p>
    <Link
      to="/"
      className="mt-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Retour à l'accueil
    </Link>
  </div>
);

export default NotFound;
