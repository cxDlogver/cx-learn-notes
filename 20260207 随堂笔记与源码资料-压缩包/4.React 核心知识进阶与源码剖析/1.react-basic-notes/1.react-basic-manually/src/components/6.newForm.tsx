export function NewFormDemo() {
  const formAction = (params: FormData) => {
    alert(params.get("name"));
  };

  return (
    <form action={formAction}>
      <label>
        Name:
        <input name="name" type="text" />
      </label>
      <input type="submit" value="Submit" />
    </form>
  );
}
