import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import AdvisorChat from "./components/AdvisorChat";
import Dashboard from "./pages/Dashboard";
import Rigs from "./pages/Rigs";
import RigDetail from "./pages/RigDetail";
import Calculator from "./pages/Calculator";
import Coins from "./pages/Coins";
import Nodes from "./pages/Nodes";
import Mystnodes from "./pages/Mystnodes";

function App() {
  return (
    <div className="App min-h-screen bg-white text-slate-900">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rigs" element={<Rigs />} />
          <Route path="/rig/:id" element={<RigDetail />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/coins" element={<Coins />} />
          <Route path="/nodes" element={<Nodes />} />
          <Route path="/mystnodes" element={<Mystnodes />} />
        </Routes>
        <AdvisorChat />
      </BrowserRouter>
    </div>
  );
}

export default App;
