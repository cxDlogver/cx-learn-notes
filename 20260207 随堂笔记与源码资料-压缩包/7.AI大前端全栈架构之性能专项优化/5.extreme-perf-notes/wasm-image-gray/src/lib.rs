mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    // alert("Hello, wasm-image-gray!");
    alert("你好，我是合一")
}


#[wasm_bindgen]
pub fn sayHello() {
    alert("你好....")
}