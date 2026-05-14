class Profile {
  final String id;
  final String username;
  final String fullName;
  final String firstName;
  final String? avatarUrl;
  final String? coverUrl;
  final String? bio;
  final String? phone;
  final String? institution;
  final String? fieldOfStudy;
  final String? academicLevel;
  final String? city;
  final String? website;
  final String role;
  final bool isPublic;
  final bool isVerified;
  final bool isActive;
  final int postCount;
  final int friendCount;
  final String? lastSeenAt;
  final String createdAt;

  const Profile({
    required this.id,
    required this.username,
    required this.fullName,
    required this.firstName,
    this.avatarUrl,
    this.coverUrl,
    this.bio,
    this.phone,
    this.institution,
    this.fieldOfStudy,
    this.academicLevel,
    this.city,
    this.website,
    this.role = 'user',
    this.isPublic = true,
    this.isVerified = false,
    this.isActive = true,
    this.postCount = 0,
    this.friendCount = 0,
    this.lastSeenAt,
    required this.createdAt,
  });

  factory Profile.fromJson(Map<String, dynamic> j) => Profile(
        id: j['id'] ?? '',
        username: j['username'] ?? '',
        fullName: j['full_name'] ?? '',
        firstName: j['first_name'] ?? '',
        avatarUrl: j['avatar_url'],
        coverUrl: j['cover_url'],
        bio: j['bio'],
        phone: j['phone'],
        institution: j['institution'],
        fieldOfStudy: j['field_of_study'],
        academicLevel: j['academic_level'],
        city: j['city'],
        website: j['website'],
        role: j['role'] ?? 'user',
        isPublic: j['is_public'] ?? true,
        isVerified: j['is_verified'] ?? false,
        isActive: j['is_active'] ?? true,
        postCount: j['post_count'] ?? 0,
        friendCount: j['friend_count'] ?? 0,
        lastSeenAt: j['last_seen_at'],
        createdAt: j['created_at'] ?? '',
      );

  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return 'U';
  }
}

class PostMedia {
  final String id;
  final String postId;
  final String mediaType;
  final String url;
  final String? fileName;
  final int? fileSize;
  final int position;

  const PostMedia({
    required this.id,
    required this.postId,
    required this.mediaType,
    required this.url,
    this.fileName,
    this.fileSize,
    required this.position,
  });

  factory PostMedia.fromJson(Map<String, dynamic> j) => PostMedia(
        id: j['id'] ?? '',
        postId: j['post_id'] ?? '',
        mediaType: j['media_type'] ?? 'image',
        url: j['url'] ?? '',
        fileName: j['file_name'],
        fileSize: j['file_size'],
        position: j['position'] ?? 0,
      );
}

class Post {
  final String id;
  final String authorId;
  final String? content;
  final String postType;
  final String? subjectName;
  final String? professorName;
  final String? academicLevel;
  final String? institution;
  final int? examYear;
  final String? eventDate;
  final String? eventLocation;
  final String? eventUrl;
  final int likeCount;
  final int commentCount;
  final bool isDeleted;
  final String createdAt;
  final Profile? author;
  final List<PostMedia> media;
  bool likedByUser;
  bool savedByUser;

  Post({
    required this.id,
    required this.authorId,
    this.content,
    required this.postType,
    this.subjectName,
    this.professorName,
    this.academicLevel,
    this.institution,
    this.examYear,
    this.eventDate,
    this.eventLocation,
    this.eventUrl,
    required this.likeCount,
    required this.commentCount,
    this.isDeleted = false,
    required this.createdAt,
    this.author,
    this.media = const [],
    this.likedByUser = false,
    this.savedByUser = false,
  });

  factory Post.fromJson(Map<String, dynamic> j) => Post(
        id: j['id'] ?? '',
        authorId: j['author_id'] ?? '',
        content: j['content'],
        postType: j['post_type'] ?? 'general',
        subjectName: j['subject_name'],
        professorName: j['professor_name'],
        academicLevel: j['academic_level'],
        institution: j['institution'],
        examYear: j['exam_year'],
        eventDate: j['event_date'],
        eventLocation: j['event_location'],
        eventUrl: j['event_url'],
        likeCount: j['like_count'] ?? 0,
        commentCount: j['comment_count'] ?? 0,
        isDeleted: j['is_deleted'] ?? false,
        createdAt: j['created_at'] ?? '',
        author: j['author'] != null ? Profile.fromJson(j['author']) : null,
        media: (j['media'] as List? ?? []).map((m) => PostMedia.fromJson(m)).toList(),
        likedByUser: j['liked_by_user'] ?? false,
        savedByUser: j['saved_by_user'] ?? false,
      );
}

class Comment {
  final String id;
  final String postId;
  final String authorId;
  final String? parentId;
  final String content;
  final int likeCount;
  final bool isDeleted;
  final String createdAt;
  final Profile? author;

  const Comment({
    required this.id,
    required this.postId,
    required this.authorId,
    this.parentId,
    required this.content,
    this.likeCount = 0,
    this.isDeleted = false,
    required this.createdAt,
    this.author,
  });

  factory Comment.fromJson(Map<String, dynamic> j) => Comment(
        id: j['id'] ?? '',
        postId: j['post_id'] ?? '',
        authorId: j['author_id'] ?? '',
        parentId: j['parent_id'],
        content: j['content'] ?? '',
        likeCount: j['like_count'] ?? 0,
        isDeleted: j['is_deleted'] ?? false,
        createdAt: j['created_at'] ?? '',
        author: j['author'] != null ? Profile.fromJson(j['author']) : null,
      );
}

class Conversation {
  final String id;
  final String participant1;
  final String participant2;
  final String? lastMessage;
  final String? lastMessageAt;
  final bool isActive;
  final String createdAt;
  final Profile? otherParticipant;
  final int unreadCount;

  const Conversation({
    required this.id,
    required this.participant1,
    required this.participant2,
    this.lastMessage,
    this.lastMessageAt,
    this.isActive = false,
    required this.createdAt,
    this.otherParticipant,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> j, String currentUserId) {
    final p1 = j['p1'] != null ? Profile.fromJson(j['p1']) : null;
    final p2 = j['p2'] != null ? Profile.fromJson(j['p2']) : null;
    return Conversation(
      id: j['id'] ?? '',
      participant1: j['participant_1'] ?? '',
      participant2: j['participant_2'] ?? '',
      lastMessage: j['last_message'],
      lastMessageAt: j['last_message_at'],
      isActive: j['is_active'] ?? false,
      createdAt: j['created_at'] ?? '',
      otherParticipant: j['participant_1'] == currentUserId ? p2 : p1,
      unreadCount: j['unread_count'] ?? 0,
    );
  }
}

class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String content;
  final String? mediaUrl;
  final bool isRead;
  final bool isDeleted;
  final bool isViewOnce;
  final bool isViewed;
  final String? replyToId;
  final String? replyToContent;
  final String? replyToSender;
  final String createdAt;
  final Profile? sender;

  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    this.mediaUrl,
    this.isRead = false,
    this.isDeleted = false,
    this.isViewOnce = false,
    this.isViewed = false,
    this.replyToId,
    this.replyToContent,
    this.replyToSender,
    required this.createdAt,
    this.sender,
  });

  factory Message.fromJson(Map<String, dynamic> j) => Message(
        id: j['id'] ?? '',
        conversationId: j['conversation_id'] ?? '',
        senderId: j['sender_id'] ?? '',
        content: j['content'] ?? '',
        mediaUrl: j['media_url'],
        isRead: j['is_read'] ?? false,
        isViewOnce: j['is_view_once'] ?? false,
        isViewed: j['is_viewed'] ?? false,
        replyToId: j['reply_to_id'],
        replyToContent: j['reply_to_content'],
        replyToSender: j['reply_to_sender'],
        isDeleted: j['is_deleted'] ?? false,
        createdAt: j['created_at'] ?? '',
        sender: j['sender'] != null ? Profile.fromJson(j['sender']) : null,
      );
}

class AppNotification {
  final String id;
  final String recipientId;
  final String? senderId;
  final String type;
  final String title;
  final String? body;
  final String? resourceType;
  final String? resourceId;
  final bool isRead;
  final String createdAt;
  final Profile? sender;

  const AppNotification({
    required this.id,
    required this.recipientId,
    this.senderId,
    required this.type,
    required this.title,
    this.body,
    this.resourceType,
    this.resourceId,
    this.isRead = false,
    required this.createdAt,
    this.sender,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] ?? '',
        recipientId: j['recipient_id'] ?? '',
        senderId: j['sender_id'],
        type: j['type'] ?? '',
        title: j['title'] ?? '',
        body: j['body'],
        resourceType: j['resource_type'],
        resourceId: j['resource_id'],
        isRead: j['is_read'] ?? false,
        createdAt: j['created_at'] ?? '',
        sender: j['sender'] != null ? Profile.fromJson(j['sender']) : null,
      );
}

class Friendship {
  final String id;
  final String requesterId;
  final String addresseeId;
  final String status;
  final String createdAt;
  final Profile? requester;
  final Profile? addressee;

  const Friendship({
    required this.id,
    required this.requesterId,
    required this.addresseeId,
    required this.status,
    required this.createdAt,
    this.requester,
    this.addressee,
  });

  factory Friendship.fromJson(Map<String, dynamic> j) => Friendship(
        id: j['id'] ?? '',
        requesterId: j['requester_id'] ?? '',
        addresseeId: j['addressee_id'] ?? '',
        status: j['status'] ?? 'pending',
        createdAt: j['created_at'] ?? '',
        requester: j['requester'] != null ? Profile.fromJson(j['requester']) : null,
        addressee: j['addressee'] != null ? Profile.fromJson(j['addressee']) : null,
      );
}
