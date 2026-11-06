import { useState, useEffect } from 'react'
import { feedbackApi, type FeedbackItem } from '../api/feedbackApi'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import './UserFeedbackScreen.css'

interface UserFeedbackScreenProps {
  onNotify?: (msg: string) => void
}

export function UserFeedbackScreen({ onNotify }: UserFeedbackScreenProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<'BUG' | 'FEATURE' | 'QUESTION' | 'OTHER'>('QUESTION')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [formError, setFormError] = useState('')

  const fetchFeedbacks = async () => {
    try {
      setLoading(true)
      const data = await feedbackApi.getMyFeedbacks()
      setFeedbacks(data)
    } catch (err: any) {
      console.error('Failed to load feedbacks:', err)
      if (onNotify) onNotify('Không thể tải lịch sử phản hồi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setFormError('Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi.')
      return
    }

    try {
      setSubmitting(true)
      setFormError('')
      const created = await feedbackApi.sendFeedback({
        title: title.trim(),
        content: content.trim(),
        category,
        priority
      })

      setFeedbacks(prev => [created, ...prev])
      setTitle('')
      setContent('')
      setCategory('QUESTION')
      setPriority('MEDIUM')
      setShowForm(false)
      if (onNotify) onNotify('Gửi phản hồi thành công! Đội ngũ Finora sẽ sớm giải đáp.')
    } catch (err: any) {
      console.error('Submit feedback failed:', err)
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED':
        return <span className="status-badge badge-resolved">Đã phản hồi</span>
      case 'IN_PROGRESS':
        return <span className="status-badge badge-progress">Đang xử lý</span>
      case 'CLOSED':
        return <span className="status-badge badge-closed">Đã đóng</span>
      case 'PENDING':
      default:
        return <span className="status-badge badge-pending">Chờ xử lý</span>
    }
  }

  const getCategoryLabel = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'BUG': return 'Báo lỗi hệ thống'
      case 'FEATURE': return 'Góp ý tính năng'
      case 'QUESTION': return 'Hỏi đáp thắc mắc'
      case 'OTHER': default: return 'Khác'
    }
  }

  const getPriorityBadge = (p: string) => {
    switch (p?.toUpperCase()) {
      case 'URGENT':
        return <span className="priority-badge priority-urgent">Khẩn cấp</span>
      case 'HIGH':
        return <span className="priority-badge priority-high">Cao</span>
      case 'LOW':
        return <span className="priority-badge priority-low">Thấp</span>
      case 'MEDIUM':
      default:
        return <span className="priority-badge priority-medium">Bình thường</span>
    }
  }

  return (
    <div className="feedback-page-container">
      {/* Page Header */}
      <div className="feedback-header-box">
        <div className="feedback-header-content">
          <div className="feedback-title-row">
            <div className="feedback-icon-bubble">
              <FinanceIcon name="message-square" size={24} />
            </div>
            <div>
              <h1 className="feedback-page-title">Hỗ trợ & Góp ý ý kiến</h1>
              <p className="feedback-page-desc">
                Finora luôn lắng nghe mọi khó khăn và đóng góp từ bạn để ngày càng hoàn thiện hơn.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-create-feedback"
            onClick={() => setShowForm(!showForm)}
          >
            <FinanceIcon name={showForm ? 'close' : 'plus'} size={18} />
            <span>{showForm ? 'Đóng biểu mẫu' : 'Gửi yêu cầu / Góp ý mới'}</span>
          </button>
        </div>
      </div>

      {/* Form Submission Card */}
      {showForm && (
        <section className="feedback-card feedback-form-card" aria-label="Biểu mẫu phản hồi">
          <h2 className="form-card-title">Gửi thông tin cho Ban Quản trị</h2>
          <form onSubmit={handleSubmit} className="feedback-form">
            {formError && <div className="feedback-alert error">{formError}</div>}

            <div className="form-grid-2">
              <div className="form-field-group">
                <label htmlFor="fb-category" className="form-label">Chủ đề yêu cầu</label>
                <select
                  id="fb-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="form-select"
                >
                  <option value="QUESTION">Hỏi đáp / Hướng dẫn sử dụng</option>
                  <option value="BUG">Báo cáo lỗi (Bug / Sự cố)</option>
                  <option value="FEATURE">Đề xuất tính năng mới</option>
                  <option value="OTHER">Chủ đề khác</option>
                </select>
              </div>

              <div className="form-field-group">
                <label htmlFor="fb-priority" className="form-label">Mức độ ưu tiên</label>
                <select
                  id="fb-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="form-select"
                >
                  <option value="LOW">Thấp (Không gấp)</option>
                  <option value="MEDIUM">Bình thường</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp (Cần xử lý ngay)</option>
                </select>
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="fb-title" className="form-label">Tiêu đề phản hồi <span className="required">*</span></label>
              <input
                id="fb-title"
                type="text"
                placeholder="VD: Không xuất được báo cáo PDF hoặc Lỗi kết nối tài khoản"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                maxLength={200}
                required
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="fb-content" className="form-label">Nội dung chi tiết <span className="required">*</span></label>
              <textarea
                id="fb-content"
                rows={4}
                placeholder="Mô tả cụ thể sự cố, trường hợp xảy ra hoặc ý tưởng đóng góp của bạn..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-textarea"
                maxLength={2000}
                required
              />
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi ngay'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* History Feedbacks List */}
      <section className="feedback-card feedback-list-card" aria-label="Lịch sử phản hồi">
        <div className="feedback-list-head">
          <div>
            <h2 className="list-card-title">Lịch sử phản hồi của bạn</h2>
            <p className="list-card-sub">Theo dõi trạng thái và câu trả lời từ đội ngũ quản trị viên Finora</p>
          </div>
          <button
            type="button"
            className="btn-refresh"
            onClick={fetchFeedbacks}
            title="Tải lại danh sách"
          >
            <FinanceIcon name="refresh" size={16} />
            <span>Làm mới</span>
          </button>
        </div>

        {loading ? (
          <div className="feedback-loading-state">
            <div className="spinner"></div>
            <p>Đang tải danh sách phản hồi...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="feedback-empty-state">
            <div className="empty-icon-wrap">
              <FinanceIcon name="message-square" size={36} />
            </div>
            <h3>Bạn chưa gửi phản hồi nào</h3>
            <p>Nếu bạn gặp sự cố hoặc cần hỗ trợ trong quá trình quản lý tài chính, hãy gửi cho chúng tôi biết nhé!</p>
            <button
              type="button"
              className="btn-primary empty-btn"
              onClick={() => setShowForm(true)}
            >
              <FinanceIcon name="plus" size={16} />
              <span>Gửi phản hồi đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="feedback-items-stack">
            {feedbacks.map((item) => (
              <div key={item.id} className="feedback-item-card">
                <div className="item-top-row">
                  <div className="item-meta-tags">
                    <span className="category-pill">{getCategoryLabel(item.category)}</span>
                    {getPriorityBadge(item.priority)}
                    {getStatusBadge(item.status)}
                  </div>
                  <time className="item-time">
                    {new Date(item.createdAt).toLocaleString('vi-VN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>

                <h3 className="item-title">{item.title}</h3>
                <p className="item-content">{item.content}</p>

                {/* Admin Reply Block if exists */}
                {item.adminReply ? (
                  <div className="admin-reply-box">
                    <div className="admin-reply-header">
                      <div className="admin-badge">
                        <FinanceIcon name="shield" size={14} />
                        <span>Phản hồi từ Ban Quản trị Finora</span>
                      </div>
                      {item.repliedAt && (
                        <span className="admin-reply-time">
                          {new Date(item.repliedAt).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="admin-reply-body">
                      {item.adminReply}
                    </div>
                  </div>
                ) : (
                  <div className="pending-reply-indicator">
                    <FinanceIcon name="clock" size={14} />
                    <span>Yêu cầu đang chờ quản trị viên xem xét và trả lời.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

