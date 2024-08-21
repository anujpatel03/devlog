const Post = require("../../model/post/post");
const User = require("../../model/user/user");
const Category = require("../../model/category/category");
const appErr = require("../../utils/appErr");
const APIFeatures = require("./../../utils/API Features");
const catchAsync = require("./../../utils/catchAsync");
const Draft = require("../../model/draft/draft");

function createStringWithFixedWords(content, numWords) {
  const words = content.split(" ");
  const selectedWords = words.slice(0, numWords);
  const result = selectedWords.join(" ");
  return result;
}

const draftCtrl = catchAsync(async (req, res) => {
  const { title, subtitle, category, content } = req.body;

  const author = await User.findById(req.user);

  const existUserDraft = await Draft.findOne({ user: req.user });
  if (existUserDraft) {
    // console.log("HIiii");
    await Draft.findByIdAndDelete(author.drafts);
  }

  const creationTime = Date.now();

  const draftCreated = await Draft.create({
    title,
    subtitle,
    user: author._id,
    category,
    content,
    creationTime,
    photo: req && req.file && req.file.path,
  });

  if (draftCreated.photo) {
    draftCreated.ContainImage = true;
    await draftCreated.save();
  }

  author.drafts = draftCreated._id;
  author.isAnyDraft = true;
  await author.save();

  res.status(201).send({
    status: "success",
    data: {
      data: draftCreated,
    },
  });
});


const getDraft = catchAsync(async (req, res) => {
  const existUserDraft = await Draft.findOne({ user: req.user });

  if (existUserDraft) {
    const data = await Draft.findById(existUserDraft._id);
    res.status(200).send({
      status: "success",
      data: {
        data: data,
      },
    });
  } else {
    res.status(404).send({
      message: "Draft not found.🙃🙃🙃",
    });
  }
});



const createPostCtrl = catchAsync(async (req, res, next) => {
  const { title, subtitle, category, content, ContainImage,isAnyDraft } = req.body;
  const author = await User.findById(req.user);
  // console.log(req.user);

  if(isAnyDraft){
    const draftData = await Draft.findOne({user:req.user});
    // console.log(draftData);
    await Draft.findByIdAndDelete(draftData._id);
    author.isAnyDraft = false;
    author.drafts = null;
    await author.save();
  }

  // const summary = content.substring(0, 200);
  let summary = createStringWithFixedWords(content, 50);
  summary += "....";

  const creationTime = Date.now();

  function countWords(str) {
    return str.trim().split(/\s+/).length;
  }

  const minute_read = Math.ceil(countWords(content) / 2 / 60);


  const TITLE = title;

  let ltext = TITLE;
  let text = ltext.toLowerCase();
  let Len = text.length;
  
  let str = "";

  for (let i = 0; i < Len; i++) {
    if (
      (text[i] >= "A" && text[i] <= "Z") ||
      (text[i] >= "a" && text[i] <= "z")
    ) {
      str = str + text[i];
    } else {
      str = str + "-";
    }
  }
  url_title = str;


  const postCreated = await Post.create({
    title,
    subtitle,
    summary,
    ContainImage,
    user: author._id,
    category,
    content,
    minute_read,
    creationTime,
    url_title,
    photo: req && req.file && req.file.path,
  });

  if (postCreated.photo) {
    // console.log(postCreated.ContainImage);
    postCreated.ContainImage = true;
    await postCreated.save();
  }

  author.posts.push(postCreated._id);
  await author.save();

  res.status(201).json({
    status: "success",
    data: {
      data: postCreated,
    },
  });
});

//for all post
const fetchPostCtrl = async (req, res, next) => {
  try {
    const posts = new APIFeatures(Post.find({}).populate("user"), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginations();

    const doc1 = await posts.query;

    let doc = [];

    doc1.map((obj) => {
      doc.push({
        title: obj.title,
        id: obj._id,
        likeCnt: obj.likes.length,
        content: obj.summary,
        minRead: obj.minute_read,
        photo: obj.photo,
        user: {
          userName: obj.user.userName,
          name: obj.user.name,
          userId: obj.user._id,
          profilePhoto: obj.user.profilePhoto,
        },
        updatedAt: obj.updatedAt,
        ContainImage: obj.ContainImage,
        creationTime: obj.creationTime,
      });
    });

    res.json({
      status: "success",
      data: {
        doc,
      },
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

const AuthecticatefetchPostCtrl = async (req, res, next) => {
  try {
    const posts = new APIFeatures(Post.find({}).populate("user"), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginations();

    const doc1 = await posts.query;

    const currentUser = await User.findById(req.user);

    // CODE COMPLEXCITY I HAVE TO REDUCE.
    currentUser.like.map(async (obj) => {
      doc1.map(async (ele) => {
        const x = ele._id.toString();
        const y = obj.toString();
        if (x == y) {
          ele.isLike = true;
        }
      });
    });

    // doc1.map(async (obj) => {
    //   currentUser.bookmarks.map(async (ele) => {
    //     const x = ele.toString();
    //     const y = obj._id.toString();
    //     if (x == y) {
    //       ele.isBookmarked = true;
    //     }
    //   })
    // });

    currentUser.Bookmarked_Post.map(async (obj) => {
      doc1.map(async (ele) => {
        const x = ele._id.toString();
        const y = obj.toString();
        if (x == y) {
          ele.isBookmarked = true;
        }
      });
    });

    let doc = [];

    doc1.map((obj) => {
      doc.push({
        title: obj.title,
        id: obj._id,
        isLiked: obj.isLike,
        isBookmarked: obj.isBookmarked,
        likeCnt: obj.likes.length,
        content: obj.summary,
        minRead: obj.minute_read,
        photo: obj.photo,
        user: {
          userName: obj.user.userName,
          name: obj.user.name,
          userId: obj.user._id,
          profilePhoto: obj.user.profilePhoto,
        },
        updatedAt: obj.updatedAt,
        ContainImage: obj.ContainImage,
        creationTime: obj.creationTime,
      });
    });

    res.json({
      status: "success",
      data: {
        doc,
      },
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

const SearchPosts = catchAsync(async (req, res, next) => {
  // const searchTerm = req.body.text;
  // const regexTerm = new RegExp(searchTerm, 'i');
  // const results = await Post.find({
  //   $or: [
  //     { title: { $regex: regexTerm } },
  //     { subtitle: { $regex: regexTerm } },
  //     { summary: { $regex: regexTerm } },
  //   ]
  // })

  // res.send(results);

  let results;
  // console.log(req.query.text);

  if (req.query.text) {
    // if (req.query.text.includes(",") || req.query.text.includes(" ")) {
    results = await Post.aggregate([
      {
        $match: {
          $text: {
            $search: req.query.text
          }
        }
      },
      {
        $lookup: {
          from: 'users', // the name of the User collection
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          // searchName: 1,
          _id: 1,
          title: 1,
          subtitle: 1,
          summary: 1,
          minute_read: 1,
          user: {
            _id: '$userDetails._id',
            username: '$userDetails.userName',
          },
          
          url_title:1,
          content: 1,
          score: { $meta: "searchScore" },
        },
      },
    ]);
  }
  res.send(results);
});

const likeCtrl = catchAsync(async (req, res, next) => {
  const currentUser = await User.findById(req.user);

  if (!currentUser.like.includes(req.params.id)) {
    currentUser.like.push(req.params.id);
    await currentUser.save();
    await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { likes: currentUser.id } },
      { safe: true, upsert: true, new: true }
    );

    res.status(200).json({
      message: "successfully liked",
    });
  } else {
    currentUser.like = currentUser.like.filter(
      (item) => item.toString() !== req.params.id.toString()
    );
    await currentUser.save();
    await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: currentUser.id } },
      { safe: true, upsert: true, new: true }
    );

    res.status(200).json({
      message: "successfully like removed",
    });
  }
});

// const bookmarksCtrl = catchAsync(async(req,res,next) => {
//   const currentUser = await User.findById(req.user);

//   if (!currentUser.bookmarks.includes(req.params.id)) {
//     currentUser.bookmarks.push(req.params.id);
//     await currentUser.save();

//     res.status(200).json({
//       message: "successfully bookmarked"
//     });
//   }
//   else{
//     currentUser.bookmarks = currentUser.bookmarks.filter(item => item.toString() !== req.params.id.toString())
//     await currentUser.save();

//     res.status(200).json({
//       message: "successfully bookmark removed"
//     });
//   }

// });

const userPostsCtrl = async (req, res, next) => {
  const UserName = req.params;

  try {
    const USer = await User.find({ userName: UserName.id });

    if (USer.length > 0) {
      const user_id = USer[0]._id;

      const UsersPost = await Post.find({ user: user_id })
        .sort({ createdAt: -1 })
        .populate("user");
      res.status(200).json({
        status: "success",

        data: UsersPost,
      });
    } else {
      res.json({
        message: "Username doesnt exist",
      });
    }
  } catch (error) {
    next(appErr(error.message));
  }
};

// for viewing single post
const postDetailsCtrl = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(appErr("Post not found"));
    }
    // Increment the numViews
    post.numViews += 1;
    await post.save();
    res.json({
      status: "success",
      data: post,
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

//Delete/api/v1/posts/:id
const deletePostCtrl = async (req, res, next) => {
  try {
    // When user delete blog then we have to delete blog id from user model.
    const post = await Post.findById(req.params.id);
    if (post.user.toString() !== req.userAuth.toString()) {
      return next(appErr("you are not allowed to delte this post ", 403));
    }

    await Post.findByIdAndDelete(req.paramsid);
    res.json({
      status: "success",
      data: "post successfully deleted",
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

//put/api/v1/posts/:id
const updatePostCtrl = async (req, res, next) => {
  const { title, subtitle, description, category, photo } = req.body;
  try {
    const post = await Post.findById(req.params.id);

    //check kr rhe hain ki yee post iss user se belong krta hai ki nhi
    if (post.user.toString() !== req.user.toString()) {
      return next(appErr("you are not allowed to update this post ", 403));
    }

    const summary = content.substring(0, 200);
    const updateTime = Date.now();

    await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        subtitle,
        summary,
        updateTime,
        description,
        category,
        photo: req && req.file && req.file.path,
      },
      { new: true }
    );

    if (req.body.content) {
      function countWords(str) {
        return str.trim().split(/\s+/).length;
      }

      const minute_read = Math.ceil(countWords(content) / 2 / 60);
      await Post.findByIdAndUpdate(req.params.id, { minute_read: minute_read });
    }

    const updatePhoto = Post.findById(req.params.id);

    if (updatePhoto.photo) {
      // console.log(postCreated.ContainImage);
      updatePhoto.ContainImage = true;
      await updatePhoto.save();
    }

    res.status(201).send({
      status: "success",
      data: post,
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

const BookmarkPostCtrl = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    const user = await User.findById(req.user);

    const bp = user.Bookmarked_Post.includes(req.params.id);
    // cobnst Is_Bookmarked = post.is_Bookmared.includes(req.userAuth);

    // console.log(bp);
    if (bp) {
      user.Bookmarked_Post = user.Bookmarked_Post.filter(
        (Bookmarked_Post) =>
          Bookmarked_Post.toString() != req.params.id.toString()
      );

      await user.save();
      return res.status(201).json({
        status: "success",
        data: "bookmarked removed",
      });
    } else {
      user.Bookmarked_Post.push(req.params.id);

      await user.save();
    }

    res.status(200).json({
      status: "success",
      data: "successfully bookmarked",
    });
  } catch (error) {
    next(appErr(error.message));
  }
};

module.exports = {
  SearchPosts,
  draftCtrl,
  getDraft,
  createPostCtrl,
  likeCtrl,
  deletePostCtrl,
  updatePostCtrl,
  AuthecticatefetchPostCtrl,
  fetchPostCtrl,
  // bookmarksCtrl,
  postDetailsCtrl,
  userPostsCtrl,
  BookmarkPostCtrl,
};
