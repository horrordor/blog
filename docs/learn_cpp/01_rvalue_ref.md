# 右值引用

右值引用起码解决了两个问题：

- 实现 move 语义（本文介绍）
- 实现完美转发（下一篇文章介绍）

本文会介绍什么是：

- 什么是右值
- 什么是右值引用、move 语义
- std::move 原理剖析
- std::move 使用注意事项

## 什么是右值

C++ 中表达式分为左值和右值，简单而言，有内存地址的表达式就是左值，它可以出现在赋值语句的左边或者右边。无法取内存地址的表达式是右值，只能出现在赋值语句的右边。

以下是 C++ 中常见的出现右值的情况：

1. 常量字面量
2. 函数调用返回的值或对象（左值引用类型除外）
3. 无名对象

```c++
int funA(int a) {
    return a;
}

int& funB(int a) {
    return a;
}

class A {
public:
    A() {}
    ~A() {}
};

int main(int argc, char* argv[]) {
    auto pos_num = &(10);            // 不能取地址 1. 常量字面量
    auto pos_funA = &(funA(0x1111)); // 不能取地址 2. 函数调用的返回值
    auto pos_funB = &(funB(0x2222)); // 函数调用返回的类型为左值引用，则返回的结果为左值
    auto pos_class = &(A());         // 不能取地址 3. 无名对象
    return 0;
}
```

## 什么是右值引用

在 C++11 之前，是只有左值引用（C++11之后，为了和右值引用区分，原来的“引用”才称为“左值引用”），没有右值引用的。因此无法用非 `const` （左值）引用匹配右值的。

比如：

```c++
int fun(int& a){
    return a;
}
```

以下调用会出错：

```c++
fun(10); // 编译报错：无法从 int 转为 int&
```

如果非要匹配，则需要使用 `const` （左值）引用：

```c++
int fun(const int& a){
    return a;
}

int main(int argc, char* argv[]){
    fun(10); // 可以编译通过。const (左值)引用可以匹配右值
    return 0;
}
```

在 C++11 之后，不用 `const` 左值引用，也可以匹配右值了：

```c++
int fun(int&& a){
    return a;
}

int main(int argc, char* argv[]){
    fun(10); // 右值引用可以匹配右值
    return 0;
}
```

当然，右值引用的发明不是主要为了解决这类简单的调用匹配问题，而是为了引入 **move 语义**。

## move 语义

先看一个右值引用发明前，资源利用效率不高的问题，以字符串类为例。我们知道，通常情况下，如果字符串做浅拷贝，是错误的：

```c++
class CMyString {
public:
    char* m_pBuffer;
    int m_iLen;
    CMyString(const char* pString) {
        m_iLen = strlen(pString) + 1;
        m_pBuffer = new char[m_iLen];
        strcpy(m_pBuffer, pString);
    }
    ~CMyString() {
        m_iLen = 0;
        if(m_pBuffer) {
            delete[] m_pBuffer;
        }
    }
    CMyString(CMyString& other) {
        // 浅拷贝，错误
        this->m_pBuffer = other.m_pBuffer;
        this->m_iLen = other.m_iLen;
    }
};
```

错误的原因在于，如果 A 对象拷贝复制自 B 对象，那么当 B 对象析构时，会销毁 `m_pBuffer` 指向的缓冲区，这样 A 对象所指向的缓冲区也被一起销毁了。因此 CMyString 其实需要的是深拷贝：

```c++
CMyString(CMyString& other) {
    // 深拷贝
    this->m_iLen = other.m_iLen;
    this->m_pBuffer = new char[m_iLen];
    strcpy(this->m_pBuffer, other.m_pBuffer);
}
```

这是安全、正确的做法。但是，在某些特殊情况下，这种深拷贝其实 **不是最高效的**，比如对于以下代码：

```c++
int main(int argc, char* argv[]){
    CMyString str1(CMyString("hello"));
    return 0;
}
```

以上的 `CMyString("hello")` 是一个右值（无名对象），这个无名对象在完成 `str1` 的构造后，生命周期也就结束了，无名对象的资源也就被释放了。

这个时候问题来了：既然明知道无名对象的资源马上就会释放，那何必不做深拷贝，而是直接“偷”这个无名对象的资源呢？代码逻辑如下：

```c++
CMyString(/*类型暂且保密*/ other) {
    this->m_iLen = other.m_iLen;
    this->m_pBuffer = other.m_pBuffer; // 浅拷贝、偷资源
    other.m_pBuffer = nullptr;         // 让 other.m_pBuffer 不被释放
}
```

有了以上概念后，我们就知道了，其实有两种“从对象B得到对象A”的构造：

- 一种是 C++11 之前的拷贝构造
- 一种是 C++11 之后引入的，专门针对 B 是右值、可以被“偷资源”场景的构造，称为 **移动构造**

用以上 CMyString 为例，揭晓移动构造的原型，它的形参是 **右值引用**：

```c++
CMyString(CMyString&& other) {
    this->m_iLen = other.m_iLen;
    this->m_pBuffer = other.m_pBuffer; // 浅拷贝、偷资源
    other.m_pBuffer = nullptr;         // 让 m_pBuffer 不因为other析构而释放
}
```

类似于拷贝构造有与之对应的运算符重载 `operator=(CMyString&)`（拷贝赋值），移动构造也有与之对应的运算符重载：`operator=(CMyString&&)`（移动赋值）。

移动构造和移动赋值，统称为 **移动语义**。

## std::move

C++11 中引入右值引用的同时，还在标准中引入了 `std::move` 函数。它的作用是“将表达式强行转为右值类型”。

我们先看下例，它是一个“可以改进”的 `myswap` 函数：

```c++
template<typename T>
void myswap(T& a, T& b) {
    T temp(a);  // 发生拷贝构造
    a = b;      // 发生拷贝赋值
    b = temp;   // 发生拷贝赋值
}
```

以上三行代码，因为没有右值类型，所以不会触发移动语义。如果 `T` 是 `CMyString`，那么会发生三次深拷贝。

但是仔细分析一下，实际上以上三行使用移动语义也是可以的：作为构造或者赋值的源变量，要么使用过一次后就不再使用，要么仅作为赋值的目标。换言之，它们的资源是可以被“偷”的。

这时候，就可以使用 `std::move` 强行把变量转为右值类型，来触发移动语义了：

```c++
template<typename T>
void myswap(T& a, T& b) {
    T temp(std::move(a)); // 发生移动构造，偷 a 的资源
    a = std::move(b);     // 发生移动构造，偷 b 的资源
    b = std::move(temp);  // 发生移动赋值，偷 temp 的资源
}
```

### std::move 原理解析

`std::move` 为什么可以神奇地把左值给强制转变成右值呢？我们可以解析它的源码知晓答案，从 C++ 头文件中找到 `move` 的源码：

```c++
template<typename _Tp>
constexpr typename std::remove_reference<_Tp>::type&&
move(_Tp&& __t) noexcept {
    return static_cast<typename std::remove_reference<_Tp>::type&&>(__t);
}
```

移除掉不太相关的 `constexpr`、`noexcept` 得到：

```c++
template<typename _Tp>
typename std::remove_reference<_Tp>::type&&
move(_Tp&& __t) {
    return static_cast<typename std::remove_reference<_Tp>::type&&>(__t);
}
```

会发现 `move` 的返回值和内部实现，都和 `std::remove_reference<_Tp>::type` 很有关系，那么继续看看 `std::remove_reference` 的实现：

```c++
template<typename _Tp>
struct remove_reference {
    typedef _Tp   type;
};

template<typename _Tp>
struct remove_reference<_Tp&> {
    typedef _Tp   type;
};

template<typename _Tp>
struct remove_reference<_Tp&&> {
    typedef _Tp   type;
};
```

发现 `remove_reference` ，发现它的作用很简单，就是不管模板参数是 `_Tp`，还是 `_Tp` 的左值引用，或者 `_Tp` 的右值引用，都统统都定义一个 `type` 等价于 `_Tp` 类型。回头看，其实 `remove_reference` 的作用顾名思义，就是“移除掉类型的引用性质” 的意思。

知道这个以后，我们可以进步一部简化 `move` 的源码，只谈原理不求严谨的话其实就是：

```c++
template<typename _Tp>
_Tp&& move(_Tp&& __t) {
    return (_Tp&&)(__t); // 强制类型转换
}
```

`move` 仅仅是做了一个强制类型转换而已（其实还涉及到了“万能引用”的知识点，我们下一篇文章介绍）。

## std::move 的使用注意事项

### 组合或者继承时，显式调用 std::move

一般而言，派生类如果是移动，那么也 **期待** 基类也是移动构造（派生类、基类的资源一起“偷”）。
但是，以下的写法是不正确的：

```c++
class CDerived:public CBase {
public:
    CDerived(CDerived&& other)
        :CBase(other) { // 无法触发 CBase 的移动构造
        // ...
    }
};
```

实际上，以上代码 **不会** 触发 `CBase` 的移动构造，而是触发的拷贝构造。

因为`有名字`的右值引用其实是`左值`，所以，当我们期待“基类也是做移动构造时”，应该显式调用`std::move`：

```c++
class CDerived:public CBase {
public:
    CDerived(CDerived&& other)
        :CBase(std::move(other)) { // 强制转为右值，触发 CBase 的移动构造
        // ...
    }
};
```

!!! note "这样的例子也适用于组合（成员初始化）的情况。"

### 局部变量返回时，不调用 std::move

有些情况下，我们会返回局部变量，比如下例：

```c++
CTemp foo() {
    CTemp x;
    return x; // x 的作用域和生命周期即将结束
}
```

这时你可能会想到“等等，在 `foo()` 调用并返回的地方，会复制一次返回值，而 x 最好转成右值，使用移动构造来复制：

```c++
CTemp foo() {
    CTemp x;
    return std::move(x); // 很可能好心办坏事
}
```

其实这样修改后，反而可能会把事情变糟糕，我们用以下试验看看效果：

```c++
#include <iostream>
#include <utility>

class CTemp {
public:
    CTemp() {
        std::cout << "CTemp：构造" << std::endl;
    }
    CTemp(CTemp& other) {
        std::cout << "CTemp：拷贝构造" << std::endl;
    }
    CTemp(CTemp&& other) {
        std::cout << "CTemp：移动构造" << std::endl;
    }
};

//2.注意实现：返回时优化
CTemp foo() {
    CTemp x;
    return x;//作用域在该函数中就结束了
}
CTemp foo_move() {
    CTemp x;
    return std::move(x);//作用域在该函数中就结束了
}

int main(int argc, char* argv[]) {
    auto a = foo();
    std::cout << "-----------" << std::endl;
    auto b = foo_move();
    return 0;
}
```

输出结果是：

```text
CTemp：构造
-----------
CTemp：构造
CTemp：移动构造
```

会发现反而是做了 `std::move` 的 `foo_move` 多了一次构造。这是为什么呢？其实是因为，现代编译器一般都做 **返回值优化**，也就是说，与其现在 `foo` 内部构造一个局部变量 `x`，再把它复制出去；不如直接在 `foo` 函数调用的地方直接构造一个 `x` 对象。这样做的效率显然比移动语义要高。

在这类情况下，不用 `std::move` 为佳。

当然，这也不是一概而论的。总之，需要非常深刻的理解 `std::move` 的“副作用”，才能做好相关优化，推荐大家可以看看 [copy elision](https://en.cppreference.com/w/cpp/language/copy_elision)。
