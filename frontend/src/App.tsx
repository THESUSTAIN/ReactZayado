import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { CockpitProvider } from "@/lib/store";
import Aujourdhui from "@/pages/Aujourdhui";
import Vision from "@/pages/Vision";
import Radar from "@/pages/Radar";
import Agent from "@/pages/Agent";
import Actions from "@/pages/Actions";
import Idees from "@/pages/Idees";
import Copilote from "@/pages/Copilote";
import Pouls from "@/pages/Pouls";
import Revue from "@/pages/Revue";
import Bienetre from "@/pages/Bienetre";

export default function App() {
  return (
    <CockpitProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Aujourdhui />} />
          <Route path="/vision" element={<Vision />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/idees" element={<Idees />} />
          <Route path="/copilote" element={<Copilote />} />
          <Route path="/pouls" element={<Pouls />} />
          <Route path="/revue" element={<Revue />} />
          <Route path="/bienetre" element={<Bienetre />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </CockpitProvider>
  );
}
