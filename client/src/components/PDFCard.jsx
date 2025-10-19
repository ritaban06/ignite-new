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
    <div className="bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl shadow-lg border border-[rgba(255,255,255,0.12)] hover:shadow-xl hover:border-white/20 transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-white transition-colors">
              {(() => {
                if (!pdf.title) return '';
                const base = pdf.title.replace(/\.[^.]+$/, '');
                return base.charAt(0).toUpperCase() + base.slice(1);
              })()}
            </h3>
            <p className="text-sm text-white/80 mt-1">
              {pdf.subject}
            </p>
          </div>
          
          <button
            onClick={onView}
            className="flex-shrink-0 flex items-center justify-center sm:space-x-1 px-2 sm:px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-105"
          >
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">View</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Description */}
        {pdf.description && (
          <p className="text-white/80 text-sm mb-4 line-clamp-2">
            {pdf.description}
          </p>
        )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
        {(pdf.departments || pdf.department) && (
          <div className="flex items-center space-x-2 text-white/70">
            <Tag className="h-4 w-4 flex-shrink-0" />
            <span>{Array.isArray(pdf.departments) ? pdf.departments.join(', ') : (pdf.department || 'N/A')}</span>
          </div>
        )}

        {pdf.year && (
          <div className="flex items-center space-x-2 text-white/70">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Year {pdf.year}</span>
          </div>
        )}

        {/* <div className="flex items-center space-x-2 text-white/70">
          <User className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {pdf.ownerName || pdf.createdByName || pdf.uploadedByName || pdf.uploadedBy?.name || <span className="italic text-white/60">Unknown</span>}
          </span>
        </div> */}

        {(pdf.uploadedAt || pdf.createdAt) && (
          <div className="flex items-center space-x-2 text-white/70">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDate(pdf.uploadedAt || pdf.createdAt)}</span>
          </div>
        )}

        {/* File Size */}
        {pdf.fileSize && (
          <div className="flex items-center space-x-2 text-white/70">
            <span>Size: {formatSize(pdf.fileSize)}</span>
          </div>
        )}
      </div>

        {/* Tags */}
        {pdf.tags && pdf.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {pdf.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20"
                >
                  {tag}
                </span>
              ))}
              {pdf.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80">
                  +{pdf.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* File info - responsive layout */}
        {showDetails && (
          // <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/60">
              <div className="flex items-center space-x-4">
                {/* <span>Size: {formatSize(pdf.fileSize || 0)}</span> */}
                {/* {pdf.viewCount !== undefined && (
                  <span>{pdf.viewCount} views</span>
                )} */}
              </div>
              
              {pdf.lastAccessed && (
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Last viewed {formatDate(pdf.lastAccessed)}</span>
                </span>
              )}
            {/* </div> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFCard;
