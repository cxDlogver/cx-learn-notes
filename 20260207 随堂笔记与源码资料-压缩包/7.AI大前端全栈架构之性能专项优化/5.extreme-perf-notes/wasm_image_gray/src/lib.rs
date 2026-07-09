use std::io::Cursor;

use wasm_bindgen::prelude::*;
use image::ImageOutputFormat;

// 宏定义，来给 web 端暴露 wasm 提供方法
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    Ok(())
}

// 定义一个函数，来给 web 端调用
#[wasm_bindgen]
pub fn greeting(name: &str) -> Result<String, JsValue> {
    Ok(format!("Hello, {}!", name))
}

// 处理图片
#[wasm_bindgen]
pub fn process_image_wasm(input_data:&[u8])  -> Result<Vec<u8>, JsValue>{
    let img = image::load_from_memory(input_data).map_err(|e|JsValue::from_str(&format!("图片加载失败： {}", e)))?;

    let scaled = img.resize(800, 600, image::imageops::FilterType::Lanczos3);

    // 滤镜处理
    let grayscale = scaled.grayscale().blur(3.5).brighten(5);

    let mut  result_buf = Vec::new();

        // 将处理后的图片写入缓冲区，格式为 JPEG，质量默认 (通常是 75)
    grayscale.write_to(&mut Cursor::new(&mut result_buf), ImageOutputFormat::Jpeg(80))
        .map_err(|e| JsValue::from_str(&format!("图片编码失败: {}", e)))?;

    // 4. 返回 Vec<u8>
    // wasm_bindgen 会自动将其转换为 JS 的 Uint8Array
    Ok(result_buf)
}