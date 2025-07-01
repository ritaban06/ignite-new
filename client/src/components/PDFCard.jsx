import React from 'react';
import { Eye, Calendar, User, Tag, Clock } from 'lucide-react';

const PDFCard = ({ pdf, onView, showDetails = true }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-primary-300 transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {pdf.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {pdf.subject}
            </p>
          </div>
          
          <button
            onClick={() => onView(pdf._id)}
            className="ml-4 flex items-center space-x-1 px-3 py-2 gradient-accent text-white rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-105"
          >
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">View</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Description */}
        {pdf.description && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-2">
            {pdf.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Tag className="h-4 w-4" />
            <span>{pdf.department}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Year {pdf.year}</span>
          </div>

          {showDetails && (
            <>
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4" />
                <span className="truncate">
                  {pdf.uploadedBy?.name || 'Unknown'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatDate(pdf.createdAt)}</span>
              </div>
            </>
          )}
        </div>

        {/* Tags */}
        {pdf.tags && pdf.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {pdf.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"
                >
                  {tag}
                </span>
              ))}
              {pdf.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  +{pdf.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer Stats */}
        {showDetails && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>{pdf.viewCount || 0} views</span>
              {pdf.fileSize && (
                <span>{formatSize(pdf.fileSize)}</span>
              )}
            </div>
            
            {pdf.lastAccessed && (
              <span>
                Last viewed {formatDate(pdf.lastAccessed)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFCard;
