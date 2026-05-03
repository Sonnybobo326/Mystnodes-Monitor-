import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Rigs from "./pages/Rigs";
import RigDetail from "./pages/RigDetail";
import Calculator from "./pages/Calculator";
import Coins from "./pages/Coins";

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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
