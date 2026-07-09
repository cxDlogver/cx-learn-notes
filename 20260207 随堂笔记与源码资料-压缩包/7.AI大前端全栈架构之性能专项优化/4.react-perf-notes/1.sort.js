/**
 * 四个递进版本：
 * 1. O(n^2)：冒泡排序，直观但低效。
 * 2. O(n log n)：归并排序，通用稳定排序。
 * 3. O(n + k)：计数排序，适用于整数且取值范围 k 可控的场景。
 * 4. O(log n)：已排序数据上的二分定位；完整排序无法做到 O(log n)。
 */

const numbers = [29, 10, 14, 37, 13, 10, 2, 45, 23];

function bubbleSortV1(list) {
  const result = [...list];

  for (let end = result.length - 1; end > 0; end -= 1) {
    let swapped = false;

    for (let index = 0; index < end; index += 1) {
      if (result[index] > result[index + 1]) {
        [result[index], result[index + 1]] = [result[index + 1], result[index]];
        swapped = true;
      }
    }

    if (!swapped) break;
  }

  return result;
}

function mergeSortV2(list) {
  if (list.length <= 1) return [...list];

  const middle = Math.floor(list.length / 2);
  const left = mergeSortV2(list.slice(0, middle));
  const right = mergeSortV2(list.slice(middle));

  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] <= right[rightIndex]) {
      result.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      result.push(right[rightIndex]);
      rightIndex += 1;
    }
  }

  return result.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function countingSortV3(list) {
  if (list.length <= 1) return [...list];

  let min = list[0];
  let max = list[0];

  for (const value of list) {
    assertInteger(value);
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const counts = Array(max - min + 1).fill(0);

  for (const value of list) {
    counts[value - min] += 1;
  }

  const result = [];

  for (let offset = 0; offset < counts.length; offset += 1) {
    for (let count = 0; count < counts[offset]; count += 1) {
      result.push(offset + min);
    }
  }

  return result;
}

function assertInteger(value) {
  if (!Number.isInteger(value)) {
    throw new TypeError("countingSortV3 只支持整数数组");
  }
}

function binarySearchIndexV4(sortedList, target) {
  let left = 0;
  let right = sortedList.length - 1;

  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);

    if (sortedList[middle] === target) return middle;
    if (sortedList[middle] < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

function findInsertIndexV4(sortedList, target) {
  let left = 0;
  let right = sortedList.length;

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2);

    if (sortedList[middle] < target) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

if (require.main === module) {
  const sortedByV1 = bubbleSortV1(numbers);
  const sortedByV2 = mergeSortV2(numbers);
  const sortedByV3 = countingSortV3(numbers);

  console.log("原始数组：", numbers);
  console.log("V1 O(n^2) 冒泡排序：", sortedByV1);
  console.log("V2 O(n log n) 归并排序：", sortedByV2);
  console.log("V3 O(n + k) 计数排序：", sortedByV3);
  console.log("V4 O(log n) 二分查找 23 的位置：", binarySearchIndexV4(sortedByV3, 23));
  console.log("V4 O(log n) 二分定位 24 的插入位置：", findInsertIndexV4(sortedByV3, 24));
}

module.exports = {
  bubbleSortV1,
  mergeSortV2,
  countingSortV3,
  binarySearchIndexV4,
  findInsertIndexV4,
};
