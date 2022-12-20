# 美化代码工具分享

## 引入

在学习深度学习框架`OneFlow`时，我发现用命令

``` shell
make of_format
```

就可以自动美化代码。所以就追溯了以上命令的实现，发现了black和clang-format这两个命令

## black和clang-format工具

### 是什么

* black 是python的一个第三方库，可以格式化python代码

* clang-format 是一个而精致文件，可以格式化C++、JAVA代码

### 怎么用

* black工具

  * 安装black工具

    ``` shell
    pip insatll black
    ```

  * 使用方法

    ``` shell
    python -m black 路径/文件名
    ```

* clang-format

  * 安装

    clang-format是LLVM工具集中的一款工具，我们可以通过安装LLVM获取。下载地址<https://releases.llvm.org/>

  * 使用方法

    ``` shell
    clang-format 路径/文件名
    ```
