use wasm_bindgen::prelude::*;
use image::ImageOutputFormat;
use std::io::Cursor;

// 设置 panic hook，方便调试
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    Ok(())
}

// 核心函数：处理图片
// input_data: JS 传来的原始文件 Uint8Array
// 返回值: 处理后的 JPEG 二进制数据
#[wasm_bindgen]
pub fn process_image_wasm(input_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    // 1. 加载图片 (自动识别格式 PNG/JPEG等)
    // image::load_from_memory 会自动检测 header
    let img = image::load_from_memory(input_data)
        .map_err(|e| JsValue::from_str(&format!("图片加载失败: {}", e)))?;

    // 2. 图像处理链
    // A. 调整大小 (Resize): 限制宽为 800px，高度自适应，使用 Lanczos3 算法保持高质量
    let scaled = img.resize(800, 600, image::imageops::FilterType::Lanczos3);

    // B. 滤镜 (Filter): 转为灰度图 (模拟复杂像素计算)
    let grayscale = scaled.grayscale();

    // 3. 编码输出 (Encode)
    // 创建一个内存缓冲区
    let mut result_buf = Vec::new();
    
    // 将处理后的图片写入缓冲区，格式为 JPEG，质量默认 (通常是 75)
    grayscale.write_to(&mut Cursor::new(&mut result_buf), ImageOutputFormat::Jpeg(80))
        .map_err(|e| JsValue::from_str(&format!("图片编码失败: {}", e)))?;

    // 4. 返回 Vec<u8>
    // wasm_bindgen 会自动将其转换为 JS 的 Uint8Array
    Ok(result_buf)
}