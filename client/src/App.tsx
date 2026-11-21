import { BrowserRouter } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
// @ts-ignore - The Home component is provided as a JavaScript module.
import Home from "./components/layout/Home";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Home />
    </BrowserRouter>
  );
}
export default App;
