# 模板 template

[上一篇文章](07_complie_link_macro.md)我们了解了宏，在此基础上，我们这期谈谈模板，包括三个主要内容：

- 模板实例化原理
- 模板显示实例化
- `static_assert` 类型检查

上一期我们提到，宏的本质就是查找替换，优点是有更快的性能，缺点是没有类型检查。那么怎么做到保留宏的优点，去掉缺点呢？我们可以使用 C++ 中的 inline 内联函数，更进阶一点的，就是本期要介绍的 **template 模板** ，模板是更强大更复杂的语法，是“更好的宏”。

接下来就从模板的实例化原理谈起，让我们看看模板和宏的相似之处，为什么要把模板称作更高级的宏？

## 模板的实例化原理

大部分朋友都是通过泛型编程了解到模板的，我们也先从这个角度回顾一下模板。如下面的 `MYMAX` 例子：

```c++
#include <stdio.h>
#include <type_traits>
#include <string.h>


int MYMAX(int x, int y) {
    return x<y ? y : x;
}

double MYMAX(double x, double y) {
    return x<y ? y : x;
}

int main(int argc, char* argv[]) {
    printf("%d\n", MYMAX(10, 5));
    printf("%1f\n", MYMAX(3.14, 2.73));
    return 0;
}
```

如果不使用模板，要想实现既支持 `int` 类型又支持 `double` 类型的 `MYMAX` 函数，就要实现两个版本的 `MYMAX` 函数。但是这两个函数的实现除了类型不一样，几乎是一样的，显得很冗余。这时候我们使用模板改造 `MYMAX` ，代码就十分简洁。如下所示，在模板部分只写了一套实现，就可以对 `int` 进行数据调用，也可以对 `double` 进行数据调用。

```c++
#include <stdio.h>
#include <string.h>


template <typename T>
T MYMAX(T x , T y) {
    return x<y ? y : x;
}

int main(int argc, char* argv[]) {
    printf("%d\n", MYMAX<int>(10, 5));
    printf("%1f\n", MYMAX<double>(3.14, 2.73));
    return 0;
}
```

然而，这里定义的模板 `MYMAX`，并不是真正的函数，而是一个 **函数生成器** 。一个模板并不会被自发地编译成 object 文件中的机器码，而只有当模板被调用时，编译器才会对它进行展开、实例化，被编译成机器码。

接下来从代码一步步看实例化是怎么具体实现的。

当编译器进入主函数扫描到 `printf("%d\n", MYMAX<int>(10, 5));` 中的 `MYMAX<int>` 时，就知道需要对模板进行展开了，于是会复制一份 `MYMAX` 的模板代码到下面，再把模板参数中的 `T` 替换成 `int` 。

对于 `MYMAX` 的 `double` 实现同理。最后利用模板创建的 `MYMAX` 和开始分别创建的 `int` 和 `double` 类型的 `MYMAX` 是一样的效果。

如下，就是手工模拟编译器进行模板实例化的结果。顺便一提，`MYMAX<int>` 和 `MYMAX<double>` 中的 `int` 和 `double` 可以省略，C++ 编译器会根据传参的类型自动推导出模板参数应该是什么。

```c++
#include <stdio.h>
#include <string.h>


template <typename T>
T MYMAX(T x , T y) {
    return x<y ? y : x;
}

int MYMAX(int x , int y) {
    return x<y ? y : x;
}

double MYMAX(double x, double y) {
    return x<y ? y : x;
}

int main(int argc, char* argv[]) {
    printf("%d\n", MYMAX<int>(10, 5));
    printf("%1f\n", MYMAX<double>(3.14, 2.73));
    return 0;
}
```

这个复制、展开、替换的过程就是模板的实例化过程，大家可以想一想，是不是和宏的行为有些许的类似呢？我们来找一些证据证明这个想法。

看看下面这个例子，我们在模板中调用了一个只有声明没有实现的函数。按道理来说程序生成时应该会遇到一个链接错误，然而生成后发现并没有错误。这就是因为我们没有调用模板函数，因此就没有实例化，也不会出现链接错误了。

```c++
#include <stdio.h>
#include <string.h>

void veryverystrangefun();

template <typename T>
T MYMAX(T x , T y) {
    veryverystrangefun();
    return x<y ? y : x;
}

int main(int argc, char* argv[]) {
    return 0;
}
```

如下，这时候如果我们在主函数中调用模板，再生成就会报链接错误了。

```c++
int main(int argc, char* argv[]) {
    printf("%d\n", MYMAX(10, 5));
    return 0;
}
```

再比如，大家之前会不会好奇，为什么 STL 中的模板实现，几乎都是写在头文件中的呢？现在应该很容易理解了，就是因为在编译过程中需要拿到模板的实现，这样子才能把模板当作代码生成器去展开。如果头文件中只有模板的声明没有实现的话，就没办法进行模板实例化了。

## 模板显式实例化

是不是不调用模板就一定不能实例化呢？其实倒也未必，C++ 中提供了模板的显式实例化语法。所谓显式实例化，就是即使不去调用模板，也能生成实例化的函数或类。

具体的语法也很简单，就是 **template关键字 + 实例化声明** 。下面还是以 `MYMAX` 为例子，来看显式实例化的具体实现。

```c++
#include <stdio.h>
#include <string.h>


template <typename T>
T MYMAX(T x , T y) {
    return x<y ? y : x;
}

template int MYMAX(int, int);
template double MYMAX(double, double);

int main(int argc, char* argv[]) {
    return 0;
}
```

到底什么情况下，才需要用到显式实例化，这个就需要结合应用场景才能明白了。在 OneFlow 中就用到了很多显式实例化的语法，这是为了配合某些设计需求，在后续也会给大家专门进行介绍。

## `static_assert` 类型检查

现在，我们有了模板版本的 `MYMAX` ，但上一期介绍的类型检查问题仍然存在。如果我们传递了字符串类型的参数，这时候依然会对字符串进行没有意义的大小比较，依然在编译时不报警告，不报错。

 `MYMAX("short string","very very long string")`

 为了解决这个问题，我们使用 `static_assert` 。`static_assert` 是在 C++11 中引入的新语法，它的作用就是让我们在编译时，就可以去做必要的检查。如果检查不通过，就会中断编译，并给出报错信息。接下来我们看看它的具体语法。

 我们在 `MYMAX` 模板中加入了 `static_assert` ，它的意思是在编译时要去检查 `T` 的类型，只有 `T` 是整数或者浮点型才合法，然后在主函数中实现整形，浮点型，字符串的实例化。进行编译就会报错，然后定位到字符串实例化所在行，并且给出报错信息 `T must be  integral or floating point` 。

```c++
#include <stdio.h>
#include <type_traits>
#include <string.h>


template <typename T>
T MYMAX(T x , T y) {
    static_assert(std::is_integral<T>::value || std::is_floating_point<T>::value,
                  "T must be  integral or floating point");
    return x<y ? y : x;
}

int main(int argc, char* argv[]) {
    printf("%d\n", MYMAX<int>(10, 5));
    printf("%1f\n", MYMAX<double>(3.14, 2.73));
    printf("%s\n", MYMAX("short string","very very long string"));
    return 0;
}
```

最后注意，`static_assert` 是在编译时的检查，并不会影响运行的性能。

大家可能会有疑问，代码中用到的 `type_traits` 和 `std::is_integral` 以及 `std::is_floating_point` 是什么东西。还有就是刚刚 `static_assert` 的操作只是逃避了字符串的比较，而没有解决字符串的比较。这些问题，我们会在后续的文章中进行详细的介绍。
