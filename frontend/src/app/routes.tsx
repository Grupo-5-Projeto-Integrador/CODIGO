import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { NewClaim } from "./pages/NewClaim";
import { ClaimDetails } from "./pages/ClaimDetails";
import { ClaimsHistory } from "./pages/ClaimsHistory";
import { Reports } from "./pages/Reports";
import { DashboardMain } from "./pages/DashboardMain";
import { LojistasMain } from "./pages/LojistasMain";
import { Treinamentos } from "./pages/Treinamentos";
import { Seguros } from "./pages/Seguros";
import { Manutencao } from "./pages/Manutencao";
import { Marketing } from "./pages/Marketing";
import { Comercial } from "./pages/Comercial";
import { Institucional } from "./pages/Institucional";
import { RelatoriosMain } from "./pages/RelatoriosMain";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "dashboard-main", Component: DashboardMain },
      { path: "lojistas-main", Component: LojistasMain },
      { path: "treinamentos", Component: Treinamentos },
      { path: "seguros", Component: Seguros },
      { path: "manutencao", Component: Manutencao },
      { path: "marketing", Component: Marketing },
      { path: "comercial", Component: Comercial },
      { path: "institucional", Component: Institucional },
      { path: "relatorios-main", Component: RelatoriosMain },
      { path: "dashboard", Component: Dashboard },
      { path: "novo-sinistro", Component: NewClaim },
      { path: "sinistro/:id", Component: ClaimDetails },
      { path: "historico", Component: ClaimsHistory },
      { path: "relatorios", Component: Reports },
    ],
  },
]);
