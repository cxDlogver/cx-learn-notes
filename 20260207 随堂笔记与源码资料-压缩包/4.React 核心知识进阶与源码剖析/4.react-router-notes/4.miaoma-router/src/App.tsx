import { Link } from "./components/Link";
import { Route, Routes } from "./components/Route";
import { BrowserRouter } from "./components/Router";
import { useNavigate } from "./hooks/useNavigate";

const Home = () => {
  const navigate = useNavigate();
  return (
    <div>
      home 页面
      <button onClick={() => navigate("/detail")}>跳转到 detail</button>
    </div>
  );
};

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route
            path="/detail"
            element={
              <div>
                detail 页面
                <Link path="home">跳转到 home</Link>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
