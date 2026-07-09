import { use } from "react";
import { fetchData } from "./data.js";

type HeaderProps = {
  id: string;
};

export const Header = (props: HeaderProps) => {
  // 假设你想这个组件一直 loading
  //   throw Promise.resolve();

  const { id } = props;
  const albums = use(fetchData(`/${id}/albums`, 1000));
  console.log("🚀 ~ Header ~ albums:", albums);

  return (
    <ul>
      {albums.map((album) => {
        return <li key={album.id}>{album.title}</li>;
      })}
    </ul>
  );
};

// function use(promise: {
//   status: "fulfilled" | "pending" | "rejected";
//   value: string;
//   reason: string;
//   then: any;
// }) {
//   console.log("🚀 ~ use ~ promise:", promise.status);
//   if (promise.status === "fulfilled") {
//     return promise.value;
//   } else if (promise.status === "rejected") {
//     throw promise.reason;
//   } else if (promise.status === "pending") {
//     throw promise;
//   } else {
//     promise.status = "pending";
//     promise.then(
//       (result) => {
//         promise.status = "fulfilled";
//         promise.value = result;
//       },
//       (reason) => {
//         promise.status = "rejected";
//         promise.reason = reason;
//       },
//     );
//     throw promise;
//   }
// }
