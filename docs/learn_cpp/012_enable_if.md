# 新标准：enable_if

[上一期](11_template_sfinae.md) 我们介绍了 SFINAE 原则，在此基础上，本篇文章将继续介绍了`enable_if` 新标准，为后续深入学习模板元编程打下基础。

本文的结构如下：

- 为什么要使用 `enable_if` ？
- `enable_if` 与 `is_same` 的使用
- `enable_if` 与 `is_same` 内部的实现原理

## 为什么要使用 enable_if ？

C++模板函数重载依赖于 SFINAE (substitution-failure-is-not-an-error) 原则，即替换失败不认为是错误，编译器将会继续寻找合适的重载函数；以返回长度的函数为例，该函数针对 STL 中的  `vector` 容器来实现（容器中有`size()`成员函数）

```c++
class CMyclass {
public:
    using size_type = unsigned int;
};

template <typename T>
decltype(T().size(), typename T::size_type()) len(T const &t) { //该函数可以避免匹配到 CMyclass 类
    return t.size();
}
unsigned len(...) {
    return 0;
}

int main() {
    vector<int>vec= {1,2,3};
    cout<<len(vec)<<endl;  //调用针对stl库容器的len函数
    cout << len(CMyclass()) << endl; //调用len(...)函数
}
```

`decltype(T().size(), typename T::size_type()) len(T const &t)` 该函数声明通过 `decltype` 类型判别将不包含 `size()` 成员函数的特例类排除出去，同时逗号表达式返回逗号后面的参数 `typename T::size_type()` ，实现避免匹配到 `CMyclass` 类的功能；这种编程技巧晦涩难懂，需要程序员根据特例类不存在的方法制因此造“错误”,并不通用；

为了实现 SFINAE ，同时降低程序的繁琐度，C++11 采用了具有通用性的 `enable_if` 新标准代替这种技巧 ；我们使用 `enable_if` 的形式重写该函数

```c++
// `enable_if`的应用
class CMyclass {
public:
    using size_type = unsigned int;
};

template <typename T, typename T2 = typename enable_if<!is_same<T, CMyclass>::value>::type> //`enable_if`形式
typename T::size_type len(T const &t) {
    return t.size();
}

unsigned len(...) {
    return 0;
}

int main() {
    vector<int> vec = {1, 2, 3};
    cout << len(vec) << endl;
    cout << len(CMyclass()) << endl;
}
```

该程序的输出结果与不采用 `enable_if` 的程序一致，说明采用 `enable_if` 也可以实现**重载函数避免匹配到特例类**的功能。

不同的地方在于，`enable_if` 可以避免匹配到 `CMyclass` 这个类，`decltype(T().size(), typename T::size_type()) len(T const &t)` 是避免匹配到不包含 `size()` 成员函数的类；
相比之下 `enable_if` 更加**灵活**。

## enable_if 与 is_same 的使用

### enable_if 的使用

首先给出 `enable_if` 的基本形式

```c++
template<bool B,typename T=void>struct enable_if
```

- 当传入的模板参数 `B` 为 `True` 的时候，`enable_if` 模板类的 `type` 就等于 `T` ；如果不传入模板参数 `T` ， `type` 也会默认为 `void`
- 当传入的模板参数 `B` 为 `False` 的时候， `enable_if` 模板类就不再拥有 `type` 。

使用 `enable_if` 时可以让重载函数自由丢弃不需要匹配的特例类；下面给出实际应用的例子

```c++
//判断类型字节数是否大于4输出显示
template <typename T>
typename std::enable_if<(sizeof(T) <= 4)>::type show() { //针对 `T` 的长度小于等于4的情况生效
    printf("size<=4\n");
}

template <typename T>
typename std::enable_if<(sizeof(T) > 4)>::type show() { //针对 `T` 的长度大于4的情况生效
    printf("size>4\n");
}

int main() {
    show<double>();
    show<char>();
}
```

输出结果为

``` text
size>4
size<=4
```

### is_same 的使用

```c++
template<class T,class U>struct is_same
```

- 当模板参数 `T` 等于模板参数 `U` 时, `is_same<T,U>`模板类的成员 `value` 等于 `True`
- 当模板参数 `T` 不等于模板 `U` 时, `is_same<T,U>`模板类的成员 `value` 等于 `False`

`is_same` 经常与 `eanble_if` 搭配使用

```c++
template <typename T, typename T2 = typename enable_if<!is_same<T, CMyclass>::value>::type> //`enable_if`形式
typename T::size_type len(T const &t) {
    return t.size();
}
```

`enable_if` 模板类的第一个参数经常用 `is_same` 的 `value` 来代替，结合起来对一些特例进行判断，实现 SFINAE

## enable_if 与 is_same 内部的实现原理

了解这两个模板类的内部实现原理之前，需要了解 type traits 的概念

### 什么是 type traits ?

traits 是 C++ 模板编程中使用的一种技术，主要功能是把功能相同而参数不同的函数抽象出来，通过 traits 将不同的参数的相同属性提取出来，在函数中利用这些用 traits 提取的属性，使得**函数对不同的参数表现一致**。

### enable_if 源码解析

下面给出 `enable_if` 的源码

```c++
template<bool, typename _Tp = void>
struct enable_if { };

template<typename _Tp>
struct enable_if<true, _Tp> {
    typedef _Tp type;
};
```

- 首先定义了一个空的通用模板，不包含任何成员
- 当第一个模板参数值为 `True` 时，将模板特例化; `type` 的类型为第二个模板参数 `_Tp` 。

### is_same 源码解析

以下代码简单实现了 `is_same` 模板类的作用

```c++
template <typename T,typename U>
struct my_is_same {
    static constexpr bool value=false;
}

template <typename T>
struct my_is_same {
    static constexpr bool value=true;
};
```

- 定义一个通用模板，针对两个模板参数类型不一致的情况，默认 `value` 值为 `False` 。
- 模板特例化，针对两个模板参数类型一致的情况，将 `value` 值设置为 `True` 。

`is_same` 和 `enable_if` 的基本实现方案可以总结为：**通用模板加模板实例化**。

## 总结

- **`enable_if` 是通用的避免重载函数匹配到特例类的解决方案,使用简单而且更加自由。**
- **`is_same` 与 `enable_if` 是 type traits 技术的典型应用,实现函数对不同参数表现一致的功能。**
- **`is_same` 与 `enable_if` 的源码实现采用了模板元编程的基本实现思想，大致分为通用模板与模板特例化。**
