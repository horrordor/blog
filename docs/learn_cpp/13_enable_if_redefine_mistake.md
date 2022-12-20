# 如何解决 `enable_if` 的重定义错误

## 前言

本文从 `enablie_if` 错误使用，导致编译报错入手，分析错误原因，并给出解决办法

本文的结构如下：

- 错误使用示例
- 错误原因分析
- 解决办法

## 错误使用示例

```c++
#include<iostream>
#include<vector>

using namespace std;

class AMyClasss {
public:
    using size_type = unsigned int;
};

class BMyClasss {
public:
    using size_type = unsigned int;
};

//T的类型需要等于 AMyClass
template<typename T, typename =  typename enable_if<is_same<T, AMyClass>::value>::type>
unsigned len (T const& t) {
    return 0;
}

//T的类型需要等于BMyClass
template<typename T, typename =  typename enable_if<is_same<T, BMyClass>::value>::type>
unsigned len (T const& t) {
    return 1;
}

int main(int argc, char* argv[]) {
    cout << len(AMyClass()) << endl;
    cout << len(AMyClass()) << endl;
    return 0;
}
```

本段代码的期待是：如果是 AMyClass 返回 1 ， BMyClass 返回 2 。

执行后，报错如下：

 `error: redefinition of 'template<class T,class> unsigned int len(const T&)'`

## 错误原因分析

重定义了默认的模板参数，间接造成了重定义 `len` 函数。 `typename enable_if<is_same<T, BMyClass>::value>::type` 最终只是得到个类型。为了分析起来更清晰，简化代码如下：

```c++
template<typename T, typename =  double>
unsigned len (T const& t) {
    return 0;
}

template<typename T, typename =  int>
unsigned len (T const& t) {
    return 1;
}
```

相当于我们定义了同一个 `len` 函数，却给了两套模板参数默认值。如果用户不设置这个模板参数， C++ 不知道是该调用 `int` 默认值还是 `double` 默认值，所以在编译时，会报重复定义的错误。

## 解决办法

使用非类型模板参数，类型已知，值可以是未知的。更改代码如下：

```c++
template<typename T, typename =  typename enable_if<is_same<T, AMyClass>::value>::type* = nullptr>
unsigned len (T const& t) {
    return 0;
}

template<typename T, typename =  typename enable_if<is_same<T, BMyClass>::value>::type* = nullptr>
unsigned len (T const& t) {
    return 1;
}
```

在默认情况下， `type` 相当于 `void` ，`type*` 相当于 `void*'`，因为用了 `enable_if` ，可以借助 SFINAE 消除调用时的二义性，解决了在编译时出现的重复定义默认函数的问题。之所以选择 `type*`   相当于把它当做一个占位符，用来实现 SFINAE 。`type` 几乎可以是任意类型，默认值 `nullptr` 也是万能的，可以赋值给任意类型的指针。

当然不一定需要使用指针来做占位符， OneFlow 中例子如下：

```c++
template<typename T, typename std::enable_if<!py::detail::is_pyobject<T>::value, int>::type = 0>
```

使用 `int` 类型来做占位符，默认值是 0 。[对应源码地址](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/api/python/functional/python_arg.h)， 71 行

更多的例子可以在 [OneFlow源码](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/api/python/functional) 中搜索
