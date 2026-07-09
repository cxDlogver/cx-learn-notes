import {
  Link,
  Outlet,
  // redirect,
  // redirectDocument,
  useNavigate,
  useParams,
} from "react-router-dom";

// case "/":
//         return <div>index</div>;
//       case "/home":
//         return <div>home</div>;
//       case "/detail":
//         return <div>detail</div>;
//       case "/issue":
//         return <div>issue</div>;

const Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <div>detail {id}</div>
      <button onClick={() => navigate("/")}>返回首页有历史记录</button>
    </div>
  );
};

export const routes = [
  {
    path: "/",
    element: (
      <div>
        <Outlet />
        <div>
          <Link to="home">home</Link>
          <Link to="detail">detail</Link>
          <Link to="issue">issue</Link>
        </div>
        index
      </div>
    ),
    children: [
      {
        path: "home",
        element: <div>home</div>,
      },
      {
        path: "detail",
        element: (
          <div>
            detail
            <Outlet />
          </div>
        ),
        children: [
          {
            path: ":id",
            element: <Detail />,
          },
        ],
      },
      {
        path: "issue",
        element: <div>issue</div>,
      },
    ],
  },
];
