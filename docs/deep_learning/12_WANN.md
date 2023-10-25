# Introduction

一个神经网络模型有两大部分组成，即网络结构和权重参数；传统神经网络模型，锁定网络结构，调整权重参数值，完成模型训练，整个训练过程变化的仅仅是权重参数值。WANN模型，不调整权重参数值，仅调整网络结构，完成模型训练，整个训练过程变化的仅仅是网络结构。经典神经网络模型两个隐藏层和一个输出层分别对应三个theta矩阵，训练过程就是调整这三个theta矩阵的各个元素，WANN模型对应一批共享权重参数，训练过程就是调整整体网络结构（增加网络复杂度）。

# 训练过程

1.) 初始化（初始化网络结构）

随机生成N个最小网络；

2.) 评估

带入样本数据，评估1.) 中的每个最小网络的效果。带入样本数据计算时，需要确定权重值，因为是权重无关，所以作者采取了简单粗暴的处理方式，让网络的所有权重都是一个值；对每个模型进行评估时，分别评估m次，每一次的权重值都不一样；例如权重值全部为2时，评估一次；权重值全部为1时，评估一次；权重值全部为0时，评估一次；权重值全部为-1时，评估一次；权重值全部为-2时，评估一次；最终取这五次的综合评估结果；

3.) 排序

根据2.) 的评估结果，从优到劣依次排序；

4.) 结构变异

结构变异有如下三种方式，分别是插入节点，添加链接，改变激活函数；在3.) 中排序后，让排前两位的模型，结构各自随机变异2次，排第三位的模型结构变异1次，排后两位的模型结构变异0次；

总过程：初始化5个不同结构模型，经过上述2.) ~ 4.)后，得到5个新的不同的结构模型；这5个新的结构模型再经过上述2.) ~ 4.)后，又会产生另外5个不同的结构模型，一直循环直到训练结束；循环过程就是5个模型的结构一直在不断更新，这和训练经典神经网络时权重参数一直在更新很像，不同之处在于经典神经网络训练时每次只保留最优的一批权重参数，而WANN每次训练时要保留最优的5个最佳结构，这又和NLP中的Beam Search很像；最后一次循环，停止在3.)，选择最优的1个结构，作为WANN训练的最终结果。

# 总结和讨论

深度学习的本质是 **拟合** ，所以只要思考这种方式能否拟合一个复杂函数即可。首先一个前提是，神经网络在宽度足够大或者深度足够大的时候可以以任意精度逼近任意函数。它的本质是组合能力。

目前的深度学习，我们固定网路结构，优化网络参数。固定的网络结构就是我们对于网络参数的 **组合方式** 是确定的，但是我们允许网络参数变化，所以我们可以通过任何方式优化网络参数使得我们的网络在这种固定组合方式下拟合想要的函数。

现在情况是，当网络参数全部固定，甚至都相同，为一个固定的数w，然后我有很多激活函数 $F = {f_1, ... , f_k}$ ，那么每个激活函数对这个w的值都不一样，即 $f_i(w)$ 不同。只要这些 $f_i(w)$ 能以一定的密度覆盖一个区间，那么它们之间相互各种组合，完全有能力拟合一个复杂函数，接下来就是找到这个拟合的组合方式，这就是论文中的网络架构搜索了。

这个让人想到over-parameterization相关的论文。在随机初始化权重的条件下，运用梯度法训练得到的权重与初始权重的欧式距离始终小于一个与网络复杂度有关的数。只要网络够复杂，参数足够多，这个欧式距离会变得更小。

也就是说在over-parameterized情况下，网络结构变复杂之后，网络结构的信息量就超过了参数的信息量，也就是说网络结构也可以看作是一种参数了。只要网络结构选取合适，随机初始化的权重可以直接用来进行测试的，并获得不错的泛化性能。