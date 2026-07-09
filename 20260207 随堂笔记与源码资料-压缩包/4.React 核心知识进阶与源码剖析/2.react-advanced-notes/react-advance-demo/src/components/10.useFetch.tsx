import { useEffect, useState } from "react";
import styles from "./10.useFetch.module.css";

// 异步操作处理 hook
type useFetchParams = { url: string };

const useFetch = (params: useFetchParams) => {
  const [loading, setLoading] = useState(false);
  const [data, setResult] = useState([]);

  useEffect(() => {
    // setLoading(true);

    fetch(params.url)
      .then((res) => {
        return res.json();
      })
      .then((res) => setResult(res))
      .finally(() => {
        setLoading(false);
      });
  }, [params.url, loading]);

  return {
    loading,
    setLoading,
    data,
  };
};

export const UseFetchDemo = () => {
  const { data, loading } = useFetch({
    url: "https://cnodejs.org/api/v1/topics",
  });

  if (loading) {
    return "loading....";
  }

  console.log("🚀 ~ UseFetchDemo ~ data:", data);

  return (
    <div className={styles.box}>
      <div className="bg-blue-500 text-8xl text-amber-400">use fetch demo</div>
      <ul>
        {data.data?.map((d) => {
          return <li key={d.id}>{d.title}</li>;
        })}
      </ul>
    </div>
  );
};
