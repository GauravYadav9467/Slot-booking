import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import { BookingSelectionProvider } from "./context/BookingSelectionContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingSelectionProvider>
          <AppRoutes />
        </BookingSelectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
