# 类型别名：从 typedef 到 using

C++ 中的 using 关键字不仅可以用于使用名称空间，还可以用于定义类型别名（type alias）和别名模板（alias template）。

本文让读者有更深入且符合直觉的理解，将先介绍函数指针，接着引出 typedef 关键字，最后谈到 using 用于定义类型别名。

本文的结构如下：

- 函数指针的定义和使用
  - 函数指针带来的阅读困难
- 使用 typedef 给函数指针起别名
- 使用 using 起别名

## 函数指针的定义和使用

回忆一下，在学习编程的初期，我们的常规操作是先定义函数，然后在合适的地方进行调用，如以下代码，先定义 `myfun`，然后再调用 `myfun`：

```c++
#include <iostream>

void myfun() {
    std::cout << "This function is called.\n" << std::endl;
}

int main(int argc, char* argv[]) {
    myfun();  // 常规的函数调用
    return 0;
}
```

一般来说，这就够了。不过，函数还有一个可能大家不那么熟悉的特性：它可以作为值赋值给变量，如：

```c++
#include <iostream>

void myfun() {
    std::cout << "This function is called.\n" << std::endl;
}

int main(int argc, char* argv[]) {
    auto ptr_myfun = myfun;  // 将函数作为值传递
    ptr_myfun();  // 运行效果与myfun()一致
    return 0;
}
```

我们会好奇，这个可以存储函数的变量究竟是什么类型的呢？毕竟，函数看起来不像是数字、字符、数组这样的数据，可以作为值被传递。

可以使用 `typeid( ptr_myfun ).name()` 查看这个变量的类型：

```c++
#include <iostream>

void myfun() {
    std::cout << "This function is called.\n" << std::endl;
}

int main(int argc, char* argv[]) {
    auto ptr_myfun = myfun;  // 将函数作为值传递
    std::cout << typeid(ptr_myfun).name() << std::endl;
    return 0;
}
```

得到输出为：

```text
void (__cdecl*)(void)
```

这其实是一个函数指针类型。

如果不用 `auto`，自己显式指定类型，那么可以这么写：

```c++
int main(int argc, char* argv[]) {
    void (*ptr_myfun)() = myfun;  // 显式地定义了函数指针
    ptr_myfun();
    std::cout << typeid(ptr_myfun).name() << std::endl;
    return 0;
}
```

重新思考一下，函数可以存储到函数指针变量中，这其实也是有道理的。从计算机系统底层的视角来看，函数就是一系列机器指令，那么函数调用其实就是把当前 CPU 的控制权移交给该函数对应的机器指令。自然而然，函数指针存储的就是这一系列指令的入口地址。

### 函数指针带来的阅读困难

可以分析出：函数指针可以被当成参数来传递，使得编程更加的灵活，这在 [STL](https://github.com/microsoft/STL/blob/main/stl/src/cthread.cpp#L109) 和各种框架中（如 [OneFlow](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/core/intrusive/ref.h#L58)）都有广泛的应用，还催生出了 C++ 强大的 lambda 语法。

但是语法的奇特带来了问题，比如 Linux 中有个古老的系统调用 `signal`，它的函数原型是这样：

```c++
void (*signal(int signum, void (*handler)(int)) ) (int);
```

它的可读性显然不高，高密度的此类代码无疑增添了程序员阅读代码时的心智负担。不过，而后设计出的 `typedef` 可以缓解这个问题。

## 使用 typedef 给函数指针起别名

基本语法为： `typedef 原类型 新别名`

它可以给函数指针等数据类型起别名，让程序的可读性更好。通过 `man 2 signal` 来查看使用 typedef 后的 `signal` 函数原型：

```text
NAME
       signal - ANSI C signal handling

SYNOPSIS
       #include <signal.h>

       typedef void (*sighandler_t)(int);  // 定义了参数为一个int，返回值为空的函数指针类型
       
       sighandler_t signal(int signum, sighandler_t handler);    // after，可读性更高
```

可以看到，使用 `typedef` 后，`signal` 的原型看起来好多了。

不过，即使这样，当 `typedef` 应用在函数指针上时，这个语法还是稍显怪异，因为通常情况下新别名出现在语句的最后，而应用在函数指针时它却出现在了中间。为了消除这种“不优雅”，C++11 推出了 using 定义类型别名。

## 使用 using 起别名

using 定义类型别名的语法为： `using 新别名=原类型`

`typedef` 和 `using` 两者应用在函数指针上的不同如下：

```c++
// eg1
typedef void (*sighandler_t)(int);  // before
using sighandler_t = void(*)(int);  // after
// eg2
typedef std::string(Foo::* fooMemFnPtr) (const std::string&);  // before
using fooMemFnPtr = std::string(Foo::*) (const std::string&);  // after
```

很显然， `using` 强制把新别名放在语句的右边，可读性更好。

然而，对于一些同学来说，这不足以劝说他们使用 `using` 来取代 `typedef`。

除了可读性外，`using` 还能做到 `typedef` 做不到的事情，比如模板别名（alias template）：

```c++
template<typename T>
typedef std::vector<T> myvec;  // 错误，编译得到“typedef 模板 非法”的错误提示

template<typename T>
using myvec = std::vector<T>;  // 可以通过编译
```

模板别名功能强大、应用广泛。在 [OneFlow 中有不少地方](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/core/common/cfg.h#L30-L36) 都应用到了：

```c++
template<typename T>
using CfgRf = ::oneflow::cfg::_RepeatedField_<T>;
template<typename T>
using CfgRpf = ::oneflow::cfg::_RepeatedField_<T>;
template<typename T1, typename T2>
using CfgMapPair = std::pair<T1, T2>;
template<typename K, typename V>
using CfgMap = ::oneflow::cfg::_MapField_<K, V>;
```

## 总结

- 使用函数指针把函数作为值传递，增加了编程的灵活性
- 灵活的函数指针增大了理解代码的难度， `typedef` 通过自定义类型的别名对其加以缓解
- `using` 赋予了此类问题更好的解决方案
