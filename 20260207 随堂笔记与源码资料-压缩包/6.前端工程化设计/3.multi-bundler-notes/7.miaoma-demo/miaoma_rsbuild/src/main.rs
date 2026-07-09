// use std::fs;

// fn main() {
//     // println!("{}", sum(1, 2));
//     // println!("Hello, world!");
//     let file_path = "/Users/heyi/Downloads/3.multi-bundler-notes/7.miaoma-demo/test.js";
//     let code = fs::read_to_string(file_path).expect("文本读取失败");
    
//     let new_code = convert_let_2_var(&code);
    
//     println!("{}", new_code);
// }

// fn convert_let_2_var(code:&str) -> String {
//     code.replace("let", "var")
// }
// // fn sum(a: i32, b: i32) -> i32 {
// //     a + b
// // }



// ---- 上面演示了通过 rust 基础正则操作完成代码编译

use parser::parse;

mod parser;


fn main() {
    let res = parse();

    if let Err(e) = res {
        eprintln!("Error：{e}")
    }


}