# Introduction

目前Transformer应用到图像领域主要有两大挑战：
- 视觉实体变化大，在不同场景下视觉Transformer性能未必很好;
- 图像分辨率高，像素点多，Transformer基于全局自注意力的计算导致计算量较大;

针对上述两个问题，MSRA提出了一种新型的Transformer架构(Swin Transformer)，其利用滑动窗口和分层结构使得Swin Transformer成为了机器视觉领域新的Backbone，在图像分类、目标检测、语义分割等多种机器视觉任务中达到了SOTA水平。

# 实现原理

Swin Transformer 的核心思想为分而治之，简单来说就是，原生 Transformer 对 N 个 token 做 Self-Attention ，复杂度为 $O(N^2)$ ，Swin Transformer 将 N 个 token 拆为 N/n 组， 每组 n （n设为常数）个token 进行计算，复杂度降为 $O(N^2/n)$ ，考虑到 n 是常数，那么复杂度其实为 $O(N)$ 。
 
分组计算的方式虽然大大降低了 Self-Attention 的复杂度，但与此同时，有两个问题需要解决，其一是分组后 Transformer 的视野局限于 n 个token，看不到全局信息，其二是组与组之间的信息缺乏交互。

对于问题一，Swin Transformer 的解决方案即 Hierarchical，每个 stage 后对 2x2 组的特征向量进行融合和压缩，这样视野就和 CNN-based 的结构一样，随着 stage 逐渐变大。

对于问题二，Swin Transformer 的解决方法是 Shifted Window，即每个 stage 的每个组都和相邻的组进行信息交互，这样就能够保证组与组之间的信息交互。思想上其实和shufflenet 类似，不过这里是空间邻接上的shuffle，而shufflenet是通道维度的shuffle。

# 总结

这篇论文提出了 Swin Transformer，它是一个层级式的Transformer，计算复杂度是跟输入图像的大小呈线性增长的。Swin Transformerr 在 COCO 和 ADE20K上的效果远远超越了之前最好的方法，希望 Swin Transformer 能够激发出更多更好的工作，尤其是在多模态方面

这篇论文里最关键的一个贡献就是基于 Shifted Window 的自注意力，它对很多视觉的任务，尤其是对下游密集预测型的任务是非常有帮助的，但是如果 Shifted Window 操作不能用到 NLP 领域里，其实在模型大一统上论据就不是那么强了，所以作者说接下来他们的未来工作就是要把 Shifted Windows用到 NLP 里面，而且如果真的能做到这一点，那 Swin Transformer真的就是一个里程碑式的工作了，而且模型大一统的故事也就讲的圆满了。

Swin Transformer还是利用了一些视觉里的先验知识，在模型大一统上，也就是 unified architecture 上来说，其实 ViT 还是做的更好的，因为它什么先验信息都不加，把所有模态的输入直接拼接起来，当成一个很长的输入，直接扔给Transformer去做，而不用考虑每个模态的特性。

