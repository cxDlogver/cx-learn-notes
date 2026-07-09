// const request = indexedDB.open("miaoma", 1);

// request.onupgradeneeded = function (event) {
//   const db = event.target.result;
//   db.createObjectStore("miaomaStudent", { keyPath: "id" });
//   db.createObjectStore("miaomaTeacher", { keyPath: "id" });
// };

// request.onsuccess = function (event) {
//   const db = event.target.result;
//   console.log("Database opened successfully");

//   const transaction = db.transaction(
//     ["miaomaStudent", "miaomaTeacher"],
//     "readwrite",
//   );
//   //   操作都是基于事务
//   const objectStore = transaction.objectStore("miaomaStudent");
//   const request = objectStore.add({ id: 1, name: "heyi", age: 18 });

//   request.onsuccess = function (event) {
//     console.log("Data added successfully");
//   };

//   request.onerror = function (event) {
//     console.log("Data add error: " + event.target.errorCode);
//   };
// };

// request.onerror = function (event) {
//   console.log("Database error: " + event.target.errorCode);
// };

const db = new Dexie("miaoma");
db.version(1).stores({
  miaomaStudent: "id, name, age",
});

const invoke = async () => {
//   await db.miaomaStudent.add({ id: 3, name: "heer", age: 100 });
  await db.miaomaStudent
    .where("age")
    .below(200)
    .toArray()
    .then((res) => console.log(res));
};

invoke()
