import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ImportPage from "./pages/ImportPage";
import BattlePage from "./pages/BattlePage";
import RankingsPage from "./pages/RankingsPage";
import SharedPage from "./pages/SharedPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/battle" element={<BattlePage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/shared/:id" element={<SharedPage />} />
        </Routes>
      </main>
    </div>
  );
}
