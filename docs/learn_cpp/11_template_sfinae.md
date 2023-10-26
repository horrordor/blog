# 搞懂SFINAE

## 前言

这期帮大家彻底搞清楚 SFINAE 是什么，包括三个主要内容：

- 函数重载的解决流程
- 模板特例的局限性
- SFINAE

## 函数重载的解决流程

大家先看一看这段代码：

```C++
void f(int x, int y) {
    //do something
}

void f(double x, double y) {
    //do something
}

int main(int argc, char* argv[]) {
    f(3, 5);
    f(3.14, 2.73);
    return 0;
}
```

这段代码在 C 语言中是编译不通过的，这是因为 C 语言是不支特“重载”的，到 C++ 才支持重载。C++ 编译器遇到某些调用语句时，它就会根据调用语句的 **参数类型** 、**个数** 、**顺序** 等来匹配到最合适的函数，然后生成调用代码。比如这个例子中函数调用 `f(3, 5)` 会匹配到第一个实现，`f(3.14, 2.73)` 则会匹配到第二个函数实现。

作为一个爱学习的人，我们应该了解编译器是如何实现重载的，在实现重载的时候又做了些什么，这对我们后面理解 SFINAE 也非常重要。这里简单罗列一下函数重载过程中到底要做哪些事：

- 将所有对应的“同名”候选函数，做成一个集合
- 根据函数声明，从集合中移除掉一些不合适的候选函数
- 在集合中剩余的函数中，依据参数，挑选一个最适合的函数。如果挑选不到，或者无法决定哪个最合适，就报错
- 如果上一步挑选到了最合适的函数，还会继续做一些检查，比如是否是被 delete 的

以上第二步根据函数声明从集合中移除掉一些不合适的候选函数主要就是依靠 SFINAE，这个后面再介绍。

而依据参数挑选一个最合适的函数这一条原则，其实指的是实参和形象的匹配呢，它是有优先级顺序的，比如说，类型完全匹配，那么优先级肯定是最高的，其次就是做一些简单的转换，比如说 `const` 的优先级，最低的就是可变参数，因为它几乎能匹配任意的参数类型，所以用来做兜底那其实是最合理的。

- 完全匹配
- const 转换
- fun(...)

## 模板特例的局限性

看了函数重载的基础之后，接下来我们就进入下一个话题，可变参模板的局限性，在之前的我们谈到了模板特例的许多优点，它可以在编译时有选择的展开，达到“编译时多态”的效果。可是如果不借助其他的语法，有时候模板特例所选择的分支，可能并不是我们想要的，并不是我们期待的。

我们来看这个例子

```c++
#include <iostream>
#include <vector>
using namespace std;

template<typename T, unsigned N>
std::size_t len (T(&)[N]) {
    return N;
}

template<typename T>
typename T::size_type len (T const&t) {
    return t.size();
}

unsigned len(...) {
    return 0;
}

int main() {
    int a[18] = {1,2,3,4,5,6,7,8,9,18};
    cout << len(a) << endl;

    vector<int> myvector {1,2,3,4,5};
    cout << len(myvector) << endl;

    cout << len(3.14) << endl;
    return 0;
}
```

在这里，我们实现了一系列的 `len` 函数，用来返回数据的长度，第一个是针对数组的模板特例，返回数组的元素个数，第二个是针对 STL 容器，通过调用对象的 `size` 方法返回容器中的元素个数，第三个是一个“兜底”函数，如果前两个都不能匹配，那么就返回 0，这样不至于编译失败。

程序运行得到的输出如下，这里结果打印都是 OK 的，第一个调用匹配的是数组特例，第二个匹配的是容器特例，最后一个匹配的是我们的“兜底”函数。

``` text
18
5
0
```

到目前为止我们打印的结果，都是符合我们期待的，但是我们加一个自定义的类，可能就会破坏这种和谐的局面。我们自定义一个这样的类，它并不打算支持 `size` 方法，但是它那里面确定了一个这样的类型  `size_type`，这时候我们内心的期待是他无法被针对数组、针对标准库容器的模板特例所捕获，所以它最后会落在 `len(...)` 这个函数上。最后的  `len(CMyClass())`  调用我们期待输出是 0。

```c++
class CMyClass {
public:
    using size_type = unsigned int;
}

int main() {
    ...
    cout << len(CMyClass()) << endl;
    ...
}
```

然而，实际情况是什么样的呢？我们编译看看，发现出现了编译报错，提示 `CMyClass` 没有 `size` 成员，编译器并没有选择 `len(...)` 的函数特例，而是选择了容器的模板特例，编译器不听话，我们要怎么纠正它呢？

```bash
main.cpp: In instantiation of ‘typename T::size_type len(const T&) [with T = CMyClass; typename T::size_type = unsigned int]’:
main.cpp:37:27:   required from here
main.cpp:15:14: error: ‘const class CMyClass’ has no member named ‘size’
     return t.size();
            ~~^~~~
<builtin>: recipe for target 'main.o' failed
make: *** [main.o] Error 1
```

## SFINAE

在解决函数那个过程中，编译器会使用实参类型对函数声明做替换，注意这里和模板的展开是不同的，这里只针对函数声明做替换，并不针对整个函数体，如果把替换完成后发现得到的函数声明是没有意义的，那该怎么办呢？其实很简单，那就是**忽略不计**，也就是我们上面说到的从候选函数集合中**移除**，并且**不报错**。这种替换失败不算错的行为，它的英文的就是 Substitution Failure Is Not An Error，它的缩写就是 SFINAE。

之前 `len(CMyClass())`  这个调用选择了容器这个函数特例，这并不是我们想要的结果，现在我们知道了 SFINAE 的存在，那么我们只需要故意让这一个特例针对 `CMyClass` 产生替换失败，从而让它在针对 `CMyClass` 的函数重载过程中，这个函数是被忽略的，这样就能达到最终 `len(CMyClass())` 匹配的是 `len(...)` 的目的。

接下来看看我们是怎么做的吧，下面这个函数就是改造后的针对容器的模板特例

```c++
template<typename T>
decltype (T().size(), typename T::size_type()) len(T const&t) {
    return t.size();
}
```

程序的输出为：

``` text
18
5
0
0
```

我们可以看到编译不再报错，最后一个调用的输出为 0，已经符合我们的预期了。这个代码看上去是不是还是有一丢丢的复杂，这里我们用至了 `decltype`，`decltype` 中乃至了逗号表达式，我们知道逗号运算符是以对右边的表达式为准，所以这里 `decltype` 最后声明的还是 `size_type`。但是因为我们这里调用了一次 `T().size()`，编译器在针对 `CMyClass` 做函数重载时，就会将其替换为 `CMyClass.size()`，而这个展开的结果是无效的，因为 `CMyClass` 是没有 `size` 方法的，于是替换失败，但是不会触发编译失败，编译器会继续找到更合适的函数，于是找到了 `len(...)`

这种编程技巧是不是有一点点可能会劝退大家，有没有一种更简单的方法来使用 SFINAE 呢？当然有！它就是我们下一期要讲的 `enable_if`。
