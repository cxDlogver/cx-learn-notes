export interface Params {
  name: string;
}

const a: Params = { name: "heyi" };

const say = (params?: Params) => {
  console.log(123, params);
};

say();
