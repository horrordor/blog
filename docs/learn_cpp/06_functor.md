# 仿函数

本文将从以下方面简单介绍 C++ 中的仿函数：

- 仿函数的定义
- 仿函数的两大优点
- lambda 函数也是一种仿函数

## 仿函数的定义与示例

西方有句谚语：如果一个东西看起来像鸭子，走起来像鸭子，那么它就是一只鸭子。而如果一样东西，不是函数，但是具有函数的性质，例如可以像函数一样调用、传参、返回值，那它是什么呢？C++ 中将其称为 **仿函数**。

中规中矩的定义和调用函数方式：

```c++
#include <iostream>

void show_value(int x) {
 std::cout << x << std::endl;
}
int main(int argc, char* argv[]) {
    show_value(10);
    return 0;
}
```

仿函数不是函数，但是可以像函数一样调用、传参、返回值。那么如何定义仿函数？答案是重载 **括号运算符**。如下代码是一个仿函数示例。

```c++
#include <iostream>

struct CMyFunctor{
    void operator()(int x) {
     std::cout << x << std::endl;
    }
};

int main(int argc, char* argv[]) {
    // auto p = CMyFunctor();  // 实例化结构体
    // p(10);                  // 调用实例化对象
    
    CMyFunctor()(10);          // 将创建实例和调用写在一起即仿函数
    
    return 0;
}
```

现代 C++ 代码中会大量使用仿函数，如 [OneFlow 的算子层](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/core/functional/impl/math_functor.cpp) ：

```c++
class ReduceSumFunctor {
public:
    ReduceSumFunctor() {
        op_ = CHECK_JUST(
                  one::OpBuilder("reduce_sum").Input("input_tensor").Output("output_tensor").Build());
    }
    Maybe<Tensor> operator()(const std::shared_ptr<one::Tensor>& x, const std::vector<int32_t>& axis,
                             const bool& keepdims) const {
        // const DataType dtype = x->dtype()->data_type();
        MutableAttrMap attrs;
        if (axis.empty()) {
            std::vector<int32_t> reduce_axis(x->shape()->NumAxes());
            std::iota(reduce_axis.begin(), reduce_axis.end(), 0);
            JUST(attrs.SetAttr<std::vector<int32_t>>("axis", reduce_axis));
        } else {
            JUST(attrs.SetAttr<std::vector<int32_t>>("axis", axis));
        }
        JUST(attrs.SetAttr<bool>("keepdims", keepdims));
        TensorProcessor tensor_processor;
        JUST(tensor_processor.AddInputs( {x}, /*lowest_dtype=*/DType::Int64()).Apply());
        TensorTuple input_tuple = JUST(tensor_processor.GetInputs());
        return OpInterpUtil::Dispatch<Tensor>(*op_, input_tuple, attrs);
    }

private:
    std::shared_ptr<OpExpr> op_;
};
```

再如 [OneFlow 类工厂](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/core/cuda/elementwise.cuh)：

```c++
template<typename FunctorT>
struct SimpleFactory {
    explicit SimpleFactory(FunctorT functor) : tpl(functor) {}
    __device__ FunctorT operator()() const {
        return tpl;
    }

private:
    FunctorT tpl;
};
```

## 仿函数的优点

- 可以保存状态
- 作为模板参数

### 可以保存状态

以计算税场景为例：

```c++
#include <iostream>
#include <vector>
#include <algorithm>

double calc_tax(double salary) {
    // 计算税的函数，税率为0.2
    return salary * 0.2;
}

void show_value(double value) {
    std::cout << value << ",";
}

int main(int argc, char* argv[]) {
    std::vector<double> salary = { 3000, 5000, 4800, 2800 };  // 收入
    std::vector<double> tax(4);                               // 税结果

    std::transform(salary.begin(), salary.end(), tax.begin(), calc_tax);  // 遍历和计算税率
    std::for_each(salary.begin(), salary.end(), show_value);
    std::cout << std::endl;
    std::for_each(tax.begin(), tax.end(), show_value);
    return 0;
}
```

当存在 **多种税率** 的时候，需要重写 `calc_tax` 函数。常见的做法是将税率作为函数参数，即：

```c++
double calc_tax_two_args(double salary, double rate) {
    return salary * rate;
}
```

但是 STL 的 `transform` 函数接受的函数类型只允许有一个参数，`calc_tax_two_args` 会出现编译不通过问题。以上问题可以通过仿函数得到解决。如下列代码所示，使用 `_rate` 保存税率，在新建实例的时候可以自定义税率，同时保持 `operator` 函数仍然只有一个参数。

```c++
#include <iostream>
#include <vector>
#include <algorithm>

struct CMyCalcTax {
    CMyCalcTax(double rate):_rate(rate) {

    }
    double operator()(double salary) {    // 仍然只有一个参数
        return salary * _rate;
    }
private:
    double _rate;                         // 用于保存税率
}

void show__value (double value) {
    std::cout << value << ",";
}

int main(int argc, char* argv[]) {
    std::vector<double> salaryl = { 3000, 5000, 4800, 2800 };
    std::vector<double> salary2 = { 3000, 5000, 4800, 2800 };
    std::vector<double> tax1(4);
    std::vector<double> tax2(4);
    std::transform(salary1.begin(), salary1.end(), tax1.begin(), CMyCalcTax(0.2));
    std::for_each(salary1.begin(), salary1.end(), show_value) ;
    std::cout << std::endl;
    std::for_each(tax1.begin(), tax1.end(), show_value);

    std::cout<<std::endl << "===========" << std::endl;
    std::transform(salary2.begin(), salary2.end(), tax2.begin(), CMyCalcTax(0.1));
    std::for_each(salary2.begin(), salary2.end(), show_value);
    std::cout << std::endl;
    std::for_each(tax2.begin(), tax2.end(), show_value);
    std::cout << std::endl;
    return 0;
}
```

从上述实例中也可以看出仿函数可以有状态，而这一特性使得仿函数比普通函数更加灵活。

### 作为模板参数

这一优点体现在模板编程中。因为仿函数的本质是 **类或者结构体的对象**，这就使得可以把仿函数的类型当作模板参数进行传递。于是某些时候就可以把运行时的开销在编译时解决掉，这也可以让软件的效率变得更高。

什么是编译时的开销？以 STL 的 `for_each` 函数为例，部分源码如下：

```c++
template<typename _InputIterator, typename _Function>
_Function
for_each(_InputIterator __first, _InputIterator __last, _Function __f) {
    // concept requirements
    __glibcxx_function_requires(_InputIteratorConcept<_InputIterator>)
    __glibcxx_requires_valid_range(__first, __last);
    for (; __first != __last; ++__first)
        __f(*__first);
    return __f; // N.B. [alg.foreach] says std::move(f) but it's redundant.
}
```

`for_each` 的第三个参数就是函数指针 `__f`，在函数内部会遍历每一个指针，并且把函数指针的效果应用到每一个元素上。但是函数既然作为参数进行传递了就涉及到 **栈资源的分配和回收**，那就会产生运行时的开销。

> 具体解释节省运行时开销：在底层的机器码中，函数调用时，参数是需要通过入栈出栈操作指令进行数据传输的，参数个数越多，则对应的传输指令越多，需要越多额外运行时间，这就是函数调用的开销。仿函数可以使某些不经常变的参数（如示例代码中的税率）不再通过参数传递、而是相当于以某个全局变量的形式传递，从而减少了参数个数。

如果此时使用的是仿函数，就可以省去这部分开销。如下代码所示，自定义一个 `my_for_each`。因为是模板编程，所以在编译时就可以完全确定，所以在运行时就不会有额外的开销了。

```c++
#include <iostream>
#include <vector>

struct CMyFunctor {
    void operator()(double value) {
        std::cout << value << ",";
    }
};

template<class InputIt, class UnaryFunction>   // 使用模板参数来处理每一个元素
UnaryFunction my_for_each(InputIt first, InputIt last) {
    for(; first != last; ++first) {
        UnaryFunction()(*first);
    }
    return UnaryFunction();
}

void show_value(double value) {
    std::cout << value << ",";
}

int main(int argc, char* argv[]) {
    std::vector<double> salary = { 3000, 5000, 4800, 2800 };
    my_for_each<decltype(salary.begin()), CMyFunctor>(salary.begin(), salary.end());
    return 0;
}
```

## C++ 中的 lambda 也是一种仿函数

lambda 函数的本质与前面讲的通过重载 `operator()` 是一模一样的。如下所示从汇编语言角度看 lambda 函数，定义 `fun` 时，`n` 放入 eax 寄存器中，并被 push 进栈；`fun` 放入 ecx 中，可以看到函数存放地址。

```c++
auto fun = [=](int x)->int {
    return X + n;
}
```

``` asm
007F5FOF lea   eax, [n]
007F5F12 push  eax
007F5F13 lea   ecx, [fun]
007F5F16 call  <1ambda_681e4b0e14b637a31b672c8686ddc480>::<lambda_681e4b0e4b637a31b672c8686ddc480> (07F33A0h)
```

如下调用示例，可以看到是通过 `operator()` 调用 `fun`，即编译器自动转换 lambda 表达式为函数对象执行。

```c++
 fun(5);
```

``` asm
007F5F1B push 5
007F5F1D lea ecx, [fun]
007F5F20 call <lambda_681e4b0e14b637a31b672c8686ddc480>::operator() (07F4080h)
```

包括 lambda 函数的 **闭包特性** 与用成员保存状态原理是基本一致的。
