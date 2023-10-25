# Introduction

在NLP领域，Self-Attention结构很常见，transformer等方法会在大型文本语料库上进行预训练，然后在较小的任务特定数据集上进行微调。它的可扩展性强、效率高，可以训练参数超过100B的模型，随着模型和数据集的增长，性能仍然没有饱和的迹象。Tansformer很香，所以在CV领域，很多人也尝试一些具有注意力机制的CNN，甚至完全代替一部分卷积，不过在GPU等硬件加速资源上，这种设计还没有得到有效扩展。

受Transformer的启发，作者将它直接从NLP领域转换到CV领域。具体来说，Vit的思想是把图片分割成小块，然后将这些小块作为一个线性的embedding作为transformer的输入，处理方式与NLP中的token相同，用监督训练的方式进行图像分类。在实验过程中，由于vit缺少CNN隐藏层中的bias，所以当在数据量不足的情况下进行训练时，不能很好地泛化，效果不如CNN。不过在训练大规模数据时，vit的效果会反超CNN。

# 模型结构

简单而言，模型由三个模块组成：Linear Projection of Flattened Patches(Embedding层)、Transformer Encoder、MLP Head（最终用于分类的层结构）。

## Embedding层结构

对于标准的Transformer模块，要求输入的是token（向量）序列，即二维矩阵[num_token, token_dim]，如下图，token0-9对应的都是向量，以ViT-B/16为例，每个token向量长度为768。

对于图像数据而言，其数据格式为[H, W, C]是三维矩阵明显不是Transformer想要的。所以需要先通过一个Embedding层来对数据做个变换。如下图所示，首先将一张图片按给定大小分成一堆Patches。以ViT-B/16为例，将输入图片(224x224)按照16x16大小的Patch进行划分，划分后会得到(224/16)^2^=196个Patches。接着通过线性映射将每个Patch映射到一维向量中，以ViT-B/16为例，每个Patche数据shape为[16, 16, 3]通过映射得到一个长度为768的向量（后面都直接称为token）。[16, 16, 3] -> [768]

在代码实现中，直接通过一个卷积层来实现。 以ViT-B/16为例，直接使用一个卷积核大小为16x16，步距为16，卷积核个数为768的卷积来实现。通过卷积[224, 224, 3] -> [14, 14, 768]，然后把H以及W两个维度展平即可[14, 14, 768] -> [196, 768]，此时正好变成了一个二维矩阵，正是Transformer想要的。

在输入Transformer Encoder之前注意需要加上[class]token以及Position Embedding。 在原论文中，作者说参考BERT，在刚刚得到的一堆tokens中插入一个专门用于分类的[class]token，这个[class]token是一个可训练的参数，数据格式和其他token一样都是一个向量，以ViT-B/16为例，就是一个长度为768的向量，与之前从图片中生成的tokens拼接在一起，Cat([1, 768], [196, 768]) -> [197, 768]。然后关于Position Embedding就是之前Transformer中讲到的Positional Encoding，这里的Position Embedding采用的是一个可训练的参数（1D Pos. Emb.），是直接叠加在tokens上的（add），所以shape要一样。以ViT-B/16为例，刚刚拼接[class]token后shape是[197, 768]，那么这里的Position Embedding的shape也是[197, 768]。


对于Position Embedding作者也有做一系列对比试验，在源码中默认使用的是1D Pos. Emb.，对比不使用Position Embedding准确率提升了大概3个点，和2D Pos. Emb.比起来没太大差别。

## Transformer Encoder层结构

Transformer Encoder其实就是重复堆叠Encoder Block L次，主要由以下几部分组成：

- Layer Norm，这种Normalization方法主要是针对NLP领域提出的，这里是对每个token进行Norm处理;
- Multi-Head Attention，这里的Multi-Head Attention和NLP中的是一样的，只不过这里的输入是二维矩阵，所以需要先reshape成三维矩阵，然后再reshape回来，具体可以看源码实现;
- Dropout/DropPath，在原论文的代码中是直接使用的Dropout层，在但rwightman实现的代码中使用的是DropPath（stochastic depth），可能后者会更好一点;
- MLP Block，就是全连接+GELU激活函数+Dropout组成也非常简单，需要注意的是第一个全连接层会把输入节点个数翻4倍[197, 768] -> [197, 3072]，第二个全连接层会还原回原节点个数[197, 3072] -> [197, 768]。

## MLP Head层结构

上面通过Transformer Encoder后输出的shape和输入的shape是保持不变的，以ViT-B/16为例，输入的是[197, 768]输出的还是[197, 768]。注意，在Transformer Encoder后其实还有一个Layer Norm没有画出来，后面有我自己画的ViT的模型可以看到详细结构。这里我们只是需要分类的信息，所以我们只需要提取出[class]token生成的对应结果就行，即[197, 768]中抽取出[class]token对应的[1, 768]。接着我们通过MLP Head得到我们最终的分类结果。MLP Head原论文中说在训练ImageNet21K时是由Linear+tanh激活函数+Linear组成。但是迁移到ImageNet1K上或者你自己的数据上时，只用一个Linear即可。

# 总结与评价

整体来说，作者提出的transformer在对视觉transformer的贡献上已经可以说是起到了一个里程碑的作用，后面很多的提出的用于各类下游任务的模型都是基于这个结构。但是模型结构仍然存在以下几点问题：一是由于对图像分块进行检测，虽然降低了计算消耗，提高了对高分辨率图像的处理能力，但是对于小目标检测却较为乏力，这一点在后面的swin transformer提出了有了改进。二是以及训练数据以及算力要求过高的问题，这一点同样在DEIT中进行了改进。

但是这里就像alexnet提出时一样，任何新提出的革命性模型，都要经过提出 - 发现问题 - 改进完善的过程，就像最近占据榜首的swin transformer等，都是在此基础上进行打补丁等的操作。

作者的贡献具体来说主要分为两点：

- 作者相对前面基于视觉transformer的模型，引入patch，避免了引入卷积带来的的归纳偏置，加入了可学习的图像位置编码。
- 作者证明了VIT在大型数据集训练后迁移到小数据集上的可行性，并可以媲美SOTA的CNN结构。

同时作者做出了展望：

- 下游任务：分割，检测等能够进一步展开。
- 对自监督预训练方法的探索。