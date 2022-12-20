# 完美转发

现代 C++ 项目的源码中，常常会使用 `std::forward` 函数。它是 C++ 标准库中的“完美转发”函数。本文会介绍：

- 什么是完美转发
- 万能引用
- `std::forward` 原理剖析

## 什么是完美转发

在某些代码场景或设计模式中，会出现参数转发的需求。

比如，以下的工厂模式，很显然是想通过`factory` 函数把参数，传递给 `T` 的构造。

```c++
template<typename T, typename Arg>
shared_ptr<T> factory(Arg arg) {
    return shared_ptr<T>(new T(arg));
}
```

最理想的情况下，我们希望 `factory` 函数就像不存在一样，`T` 的构造就像被直接调用一样。不严谨地说（严谨的定义在下文中），这就是完美转发。

### 转发参数的窘境 I

然而，以上的代码并不完美：`factory` 函数的参数是值传递的，`factory` 函数调用时，会先发生一次参数拷贝，这样有性能代价。

那自然会有人想到，可以不做值传递，改成引用传递，提高性能：

```c++
template<typename T, typename Arg>
shared_ptr<T> factory(Arg& arg /*改成（左值）引用*/) {
    return shared_ptr<T>(new T(arg));
}
```

但是，以上的代码也不“完美”，首先的问题是 `factory` 调用时，无法传递右值：

```c++
factory<Foo, int>(5/*右值*/); //出错，无法传递右值
```

虽然这个问题可以通过使用 `const` 引用（勉强）解决：

```c++
template<typename T, typename Arg>
shared_ptr<T> factory(Arg const& arg) {
    return shared_ptr<T>(new T(arg));
}
```

但是它并不优雅，当有多个形参时，用这种方法解决右值传递的问题，需要为每个形参实现 `const` 和非 `cosnt` 版本，这是一个复杂的排列组合问题。

比如，假设 `factory` 有三个形参，那么需要实现以下的重载：

```c++
factory(const T&, const T&, const T&);
factory(T&, const T&, const T&);
factory(const T&, T&, const T&);
factory(const T&, const T&, T&);
factory(const T&, T&, T&);
factory(T&, const T&,  T&);
factory(T&,  T&, const T&);
factory(T&,  T&, T&);
```

### 转发的窘境 II

其次，这种方式 **更本质的缺点** 是：`factory` 内部，因为 `arg` 一定是左值，无法触发移动语义：

```c++
template<typename T, typename Arg>
shared_ptr<T> factory(Arg const& arg) {
    return shared_ptr<T>(new T(arg/* arg 有名字，一定是左值，无法触发移动语义*/));
}
```

## 完美转发 `std::forward`

我们之前比较友好但是不严谨地定义了“完美转发”是“外层 warpper（`factory`函数）就像不存在，内层函数像是被直接调用一样”。

完美转发的严谨定义其实应该是：

1. 调用 wrapper （`factory`）时传递的是左值，内层函数被调用时得到的就是左值
2. 调用 wrapper （`factory`）时传递的是右值，内层函数被调用时得到的就是右值

这个时候，我们使用 `std::forward` 就可以达到这个目的。

看以下的例子：

```c++
#include <iostream>
#include <utility>
#include <memory>

using namespace std;
class CBase {
public:
    CBase(int&) {
        cout << "CBase(int&)" << endl;
    }

    CBase(int&&) {
        cout << "CBase(int&&)" << endl;
    }
};

template<typename T, typename Arg>
shared_ptr<T> facotry(Arg&& arg) {
    return shared_ptr<T>(new T(std::forward<Arg>(arg)));
}

int main() {
    int value = 5;
    auto p1 = facotry<CBase>(5);
    auto p2 = facotry<CBase>(value);
}
```

会输出：

```text
CBase(int&&)  # 对应了 facotry<CBase>(5);
CBase(int&)   # 对应了 facotry<CBase>(value);
```

这说明 `forward` 确实“完美转发”了参数：

- 当调用 `facotry<CBase>(5)` 时，`5` 是右值，传递给 `new T(std::forward<Arg>(arg))` 的也是右值，最终触发的是 `CBase(int&&)`
- 当调用 `facotry<CBase>(value)` 时，`value` 是左值，传递给 `new T(std::forward<Arg>(arg))` 的也是左值，最终触发的是 `CBase(int&)`

为什么会这样呢？等我们学习了“万能引用”和“引用折叠”后，就可以剖析 `std::forward` 的代码实现了。

## `std::forward` 代码剖析

要解读 `std::forward` 内部代码实现，需要先掌握 **万能引用** 和 **引用折叠** 的知识。

### 万能引用

对于一个普通函数，它的形参，要么接受左值、要么接受右值类型。就像我们这里的 `foo1` 只能接收左值；`foo2` 只能接收右值。

```c++
#include <iostream>
#include <utility>
#include <memory>

using namespace std;

void foo1(int&) {
    cout << "foo(int&)" << endl;
}

void foo2(int&&) {
    cout << "foo(int&&)" << endl;
}

int main() {
    int value = 5;
    foo1(5);     // 错
    foo1(value); // 对

    foo2(5);     // 对
    foo2(value); // 错
}
```

但是，从 C++11 开始，规定了一种特殊的形式下，函数形参既可以匹配左值，也可以匹配右值。

这种情况必须是模板的形式，并且以 `&&` 作为形参数。它被称为“万能引用”（英文为 universal reference 或 forwarding refference）。

以下的 `foo` 的形参就是“万能引用”：

```c++
template<typename T>
void foo(T&& arg) {
    cout << "foo(T&& arg)" << endl;
}
```

它既可以匹配左值，又可以匹配右值：

```c++
int main() {
    int value = 5;
    foo(5);     // 可以
    foo(value); // 可以
}
```

那为什么这种神奇的形式，可以既匹配左值，又匹配右值呢，其实是因为 C++11 引入了引用折叠。

### 引用折叠

在 C++11 之前，是不允许引用的引用存在的。但是 C++11 之后，引用的引用在特定情况下允许存在，他们会在编译时，被自动化简为左值引用或者右值引用，化简的过程称为 **引用折叠**。

化简的规则如下：

```text
T& &   => T&
T&& &  => T&
T& &&  => T&
T&& && => T&&
```

它是怎么在“万能引用”中发挥作用的呢？这是因为 C++ 里规定了万能引用（模板）被调用时，模板参数的展开规则如下：

1. 当 foo 调用时实参为类型T的左值，那么模板T会被展开为 T&
2. 当 foo 调用时实参为类型T的右值，那么模板T会被展开为 T

我们回顾我们刚才的代码：

```c++
template<typename T>
void foo(T&& arg) {
    cout << "foo(T&& arg)" << endl;
}

int main() {
    int value = 5;
    foo(value); // 左值，模板T 被展开为 int&
    foo(5);     // 右值，模板T 被展开为 int
}
```

所以当 `foo(value)` 调用时， `void foo(T&& arg)` 中的 `T` 会被展开为 `int&`，函数被展开为 `void foo(int& && arg)`，经过引用折叠，得到的是 `void foo(int& arg)`，匹配左值。

类似的，当 `foo(5)` 调用时， `void foo(T&& arg)` 中的 `T` 会被展开为 `int`，函数被展开为 `void foo(int && arg)`，匹配右值。

### std::forward 的原理剖析

现在我们可以来查看 `std::forward` 中的实现原理了。查看库函数中的原始实现：

```c++
template<typename _Tp>
constexpr _Tp&&
forward(typename std::remove_reference<_Tp>::type& __t) noexcept
{ return static_cast<_Tp&&>(__t); }

template<typename _Tp>
constexpr _Tp&&
forward(typename std::remove_reference<_Tp>::type&& __t) noexcept {
    static_assert(!std::is_lvalue_reference<_Tp>::value, "template argument"
    " substituting _Tp is an lvalue reference type");
    return static_cast<_Tp&&>(__t);
}
```

与上一篇文章类似，去掉 `constexpr`、`static_assert`、`noexcept` 这些非核心重点，以及简化上一篇文章介绍过的 `remove_reference` 之后：

```c++
template<typename _Tp>
_Tp&& forward(_TP& __t) {
    return static_cast<_Tp&&>(__t);
}

template<typename _Tp>
_Tp&& forward(_TP&& __t) {
    return static_cast<_Tp&&>(__t);
}
```

当 `forward` 调用时传递的是左值时，会匹配模板特例：

```c++
template<typename _Tp>
_Tp&& forward(_TP& __t) {
    return static_cast<_Tp&&>(__t);
}
```

`_TP` 会被展开为 `T&`：

```c++
T& && forward(T& & __t) {
    return static_cast<T& &&>(__t);
}
```

经引用折叠后得到：

```c++
T& forward(T& __t) {
    return static_cast<T&>(__t);
}
```

也就说把 `__t` 转为左值引用类型后返回。

类似地，如果 `forward` 调用时传递的是右值时，那么会匹配模板特例：

```c++
template<typename _Tp>
_Tp&& forward(_TP&& __t) {
    return static_cast<_Tp&&>(__t);
}
```

`_TP` 会被展开为 `T`：

```c++
T&& forward(T && __t) {
    return static_cast<T&&>(__t);
}
```

也就说把 `__t` 转为右值引用类型后返回。
