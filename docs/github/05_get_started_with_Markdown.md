#  快速上手 Markdown

## 什么是 Markdown

Markdown 是一种标记性语言，在 GitHub 上提交 issue、PR，默认都使用的是 Markdown。

## 学习 Markdown 语法

我们接下来看看常见的 Markdown 语法。

### 1. 标题

在想要设置为标题的文字前面加 `#` 来表示。一个 `#` 是一级标题，两个 `#` 是二级标题，以此类推。

``` markdown
# 这是一级标题
## 这是二级标题
### 这是三级标题
#### 这是四级标题
##### 这是五级标题
###### 这是六级标题
```

!!! note "注意：`#` 和标题名称要保留一个字符的空格。"

### 2. 图片

``` markdown
![图片alt](图片地址 "图片title")
```

图片 alt 就是显示在图片下面的文字，相当于对图片内容的解释。图片 title 是图片的标题。

!!! note "title 可加可不加。"

### 3. 超链接

语法：

``` markdown
[超链接名](超链接地址 "超链接title")
```

!!! note "title 可加可不加"

### 4. 代码

单行代码：代码之间分别用一个反引号包起来

``` markdown
`代码内容`
```

代码块：代码之间分别用三个反引号包起来，在第一行引号后面加入代码种类可以获得代码高亮。

```` markdown
```Python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        hashtable = dict()
        for i in range(len(nums)):
            if target - nums[i] in hashtable:
                return [i, hashtable[target - nums[i]]]
            hashtable[nums[i]] = i
```
````

### 5. 引用

`>` 表示引用，表示当前语句不是自己的，在开源项目中常常用于回复别人的话。

示例：

```
> C++ 很好用
```

效果：

> C++ 很好用

!!! note "除了上述语法外，Markdown 还有很多用法，大家可以在扩展阅读中学习。"

## VS Code 插件分享

这里分享一个非常实用的插件，在使用 Markdown 时，[**Auto-Open Markdown Preview**](https://marketplace.visualstudio.com/items?itemName=hnw.vscode-auto-open-markdown-preview) 插件可以帮我们实时渲染 Markdown 页面。

## 扩展阅读

- [GitHub 官方 Markdown 教程](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
