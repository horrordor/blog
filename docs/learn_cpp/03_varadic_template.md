# 可变参模板

## 什么是可变参

在介绍变参模板之前，我们先讲下（可）变参函数，他们两者虽然没有直接关系，
但是有类似的直观认识。

什么是变参函数呢，学过 C 语言的人，不一定听说过这个名字，但一定已经用过变参函数。因为 `printf` 就是变参函数。

所谓变参函数，就是调用时传递的参数个数是可以变化的。比如 `printf`：

```c++
printf("%d, %d", 10, 20);
printf("%d, %d, %d", 10, 20, 30);
```

而我们定义的普通函数却不能这样，参数个数是确定的：

```c++
int foo(int , int); // 只能2个参数
int foo(int, int, int); // 只能三个参数
```

至于怎么实现变参函数，不是本文重点，我们就跳过了。感兴趣的可以通过搜索变参函数 + `va_start` 关键字得到答案。

## 变参模板基本语法

所谓的变参模板，实现原理和变参函数是不一样的。

变参函数是运行时解析栈来达到可变参的目的。

而可变参模板是编译时通过模板展开达到目的的，没有运行时的额外性能损失。

但两者的直观效果是类似的，都可以定义函数或者类方法，接收任意个数的参数。

## 变参模板的实例

让我们先从最简单的例子，看看变参模板的语法。

```c++
template<typename... Args>
void fun(Args... args) {
// do something
}

int main(int argc, char* argv[]) {
    fun(1, 3.5, "hello");
    fun(1, 2);
    fun(1);
    return 0;
}
```

以上定义了一个变参模板。我们来调用它会发现，无论是传递3个参数、2个参数还是1个参数，都是可以的。甚至参数类型不一致也是可以的。

通过上面的简单例子，我们总结下变参模板的基本语法，会发现关键点是两个：

1. 使用 `typename...` 修饰模板参数，大家其实可以把它简单理解成 `typename` 之外的新关键字，专门用于修饰变参模板的模板参数
2. `Args... args`，这其实是告诉编译器，这个函数，参数个数是可变的

可变参模板的语法还是很简单的。不过，虽然我们用变参模板实现了函数，调用时可以传递任意个参数，这个函数内部却并没有使用参数，到目前为止，定义的函数一点用都没有。

我们接着要看可变参模板函数内部，如何使用参数。

### 打印任意个参数

我们先看一个实际的例子。如何使用变参模板“递归”实现一个可以打印任意多个参数的 `myprint`。

```c++
#include <iostream>

void myprint() {
// do something
}

template<typename T, typename... Args>
void myprint(T firstArg, Args... args) {
    std::cout << firstArg << std::endl; // 打印第一个参数
    myprint(args...);                     // 打印剩下的参数
}

int main(int argc, char* argv[]) {
    myprint(1, 3.14, "hello");
    return 0;
}
```

我们暂时不用纠结细节，只要知道其中的关键点是： `Args...` 和 `args...`。它们是很重要的操作，称为 **解包**（pack expansion）。也就是根据调用时的情况，把打包好的参数展开。

直接解释 `myprint` 的工作原理比较复杂，我们先通过 `myprint` 的模板展开过程了解解包操作。

### `myprint` 的展开过程

当 `myprint` 第一次被调用时（即 `myprint(1, 3.14, "hello");`），第一个参数 `1`，会被推导成 `int` 类型，`3.14` 被推导成 `double` 类型，`"Hello"` 被推导成 `const char*` 类型，`myprint` 模板被替换成了这个函数：

```c++
//第一次调用： myprint(1, 3.14, "hello");
void myprint(int firstArg, double E1, const char* E2/*T firstArg, Args... args*/) {
    std::cout << firstArg << std::endl;  // firstArg=1  打印第一个参数
    //myprint(args...);
    //E1=3.14   E2="hello"
    myprint(E1,E2);                     // 打印剩下的参数
}
```

类似的，以上 `myprint(E1,E2);` 会被自动推导类型，并展开为如下函数：

```c++
//第二次调用： myprint(3.14, "hello");
void myprint(double firstArg,const char* E1/*T firstArg, Args... args*/) {
    std::cout << firstArg << std::endl;  // firstArg=3.14 打印第一个参数
    //myprint(args...);E1="hello"
    myprint(E1);                     // 打印剩下的参数
}
```

继续，`myprint(E1);` 会被展开为：

```c++
//第三次调用： myprint("hello");
void myprint(const char* firstArg/*T firstArg, Args... args*/) {
    std::cout << firstArg << std::endl;  // firstArg="hello" 打印第一个参数
    //myprint(args...);E1=无参数
    myprint();                     // 打印剩下的参数
}
```

可以看到，这一次展开，内部的 `myprint()` 已经没有实参了，这也是在最初的实现 `myprit` 时，我们需要实现没有参数的 `myprint` 的原因：

```c++
void myprint(){
// do something
}
```

## `sizeof...` 运算符

变参模板的重点和原理，基本介绍完了。还有一个相关的运算符需要了解：`sizeof...`。

它解决的需求是：帮助我们在编译时知晓，函数调用时具体有几个参数。

```c++
template<typename... Args>
void fun(Args... args) {
    std::cout <<"sizeof...(Args): " <<sizeof...(Args) << std::endl;
    std::cout <<"sizeof...(args): " <<sizeof...(args) << std::endl;
    std::cout <<"======================"<< std::endl;
}

int main(int argc, char* argv[]) {
    fun(1, 3.5, "hello");
    fun(1, 2);
    fun(1);
    return 0;
}
```

输出结果：

```text
sizeof...(Args): 3
sizeof...(args): 3
======================
sizeof...(Args): 2
sizeof...(args): 2
======================
sizeof...(Args): 1
sizeof...(args): 1
======================
```

## 总结

变参模板有什么用呢？其实独立使用变参模板的场景很少。但是结合我们之前介绍的完美转发，它被广泛应用于“创造类”的设计模式中。

## 扩展阅读

- [parameter pack](https://en.cppreference.com/w/cpp/language/parameter_pack)
