/* global $gp, $gp_reject_feedback_settings, document, tb_show */
( function( $, $gp ) {
	$( document ).ready(
		function() {
			var rowIds = [];
			var translationIds = [];
			var originalIds = [];
			var feedbackForm = '<details><summary class="feedback-summary">Give feedback</summary>' +
			'<div id="feedback-form">' +
			'<form>' +
			'<h3 class="feedback-reason-title">Reason</h3>' +
			'<ul class="feedback-reason-list">' +
			getReasonList( 'single' ) +
			'</ul>' +
			'<div class="feedback-comment">' +
				'<label>Comment </label>' +
				'<textarea name="feedback_comment"></textarea>' +
			'</div>' +
			'</form>' +
			'</div>' +
			'</details>';

			var modalFeedbackForm =
			'<div id="reject-feedback-form" style="display:none;">' +
			'<form>' +
			'<h3>Reason</h3>' +
			getReasonList( 'bulk' ) +
			'<div class="modal-comment">' +
					'<label>Comment </label>' +
					'<textarea name="modal_feedback_comment"></textarea>' +
			'</div>' +
			'<button id="modal-reject-btn" class="modal-btn">Reject</button>' +
			'</form>' +
			'</div>';

			$( 'body' ).append( modalFeedbackForm );

			// Remove click event added to <summary> by wporg-gp-customizations plugin
			$( $gp.editor.table ).off( 'click', 'summary' );

			$( 'button.reject' ).closest( 'dl,div.status-actions' ).prepend( feedbackForm );

			$( '#bulk-actions-toolbar-top .button, #bulk-actions-toolbar .button' ).click( function( e ) {
				rowIds = $( 'input:checked', $( 'table#translations th.checkbox' ) ).map( function() {
					var selectedRow = $( this ).parents( 'tr.preview' );
					if ( ! selectedRow.hasClass( 'untranslated' ) ) {
						return selectedRow.attr( 'row' );
					}
					$( this ).prop( 'checked', false );
					return null;
				} ).get();

				rowIds.forEach( function( rowId ) {
					var originalId = $gp.editor.original_id_from_row_id( rowId );
					var translationId = $gp.editor.translation_id_from_row_id( rowId );

					if ( originalId && translationId ) {
						originalIds.push( originalId );
						translationIds.push( translationId );
					}
				} );

				if ( $( 'select[name="bulk[action]"]' ).val() === 'reject' ) {
					e.preventDefault();
					e.stopImmediatePropagation();
					if ( ! translationIds.length ) {
						$( 'form.filters-toolbar.bulk-actions, form#bulk-actions-toolbar-top' ).submit();
						return;
					}

					// eslint-disable-next-line no-undef
					tb_show( 'Reject with Feedback', '#TB_inline?inlineId=reject-feedback-form' );
				}
			} );

			$( 'body' ).on( 'click', '#modal-reject-btn', function( e ) {
				var comment = '';
				var rejectReason = [];
				var rejectData = {};
				var form = $( this ).closest( 'form' );

				form.find( 'input[name="modal_feedback_reason"]:checked' ).each(
					function() {
						rejectReason.push( this.value );
					}
				);

				comment = form.find( 'textarea[name="modal_feedback_comment"]' ).val();

				if ( ( ! comment.trim().length && ! rejectReason.length ) || ( ! translationIds.length || ! originalIds.length ) ) {
					$( 'form.filters-toolbar.bulk-actions, form#bulk-actions-toolbar-top' ).submit();
				}

				rejectData.locale_slug = $gp_reject_feedback_settings.locale_slug;
				rejectData.reason = rejectReason;
				rejectData.comment = comment;
				rejectData.original_id = originalIds;
				rejectData.translation_id = translationIds;
				rejectData.is_bulk_reject = true;
				rejectWithFeedback( rejectData );
				e.preventDefault();
			} );
		}
	);

	$gp.editor.hooks.set_status_rejected = function() {
		var button = $( this );
		var rejectData = {};
		var rejectReason = [];
		var comment = '';
		var div = button.closest( 'div.meta' );

		div.find( 'input[name="feedback_reason"]:checked' ).each(
			function() {
				rejectReason.push( this.value );
			}
		);

		comment = div.find( 'textarea[name="feedback_comment"]' ).val();

		if ( ! comment.trim().length && ! rejectReason.length ) {
			$gp.editor.set_status( button, 'rejected' );
			return;
		}

		rejectData.locale_slug = $gp_reject_feedback_settings.locale_slug;
		rejectData.reason = rejectReason;
		rejectData.comment = comment;
		rejectData.original_id = [ $gp.editor.current.original_id ];
		rejectData.translation_id = [ $gp.editor.current.translation_id ];

		rejectWithFeedback( rejectData, button );
	};

	function rejectWithFeedback( rejectData, button ) {
		var data = {};
		var div = {};
		if ( button ) {
			div = button.closest( 'div.meta' );
		}

		data = {
			action: 'reject_with_feedback',
			data: rejectData,

			_ajax_nonce: $gp_reject_feedback_settings.nonce,
		};

		$.ajax(
			{
				type: 'POST',

				url: $gp_reject_feedback_settings.url,
				data: data,
			}
		).done(
			function() {
				if ( rejectData.is_bulk_reject ) {
					$( 'form.filters-toolbar.bulk-actions, form#bulk-actions-toolbar-top' ).submit();
				} else {
					$gp.editor.set_status( button, 'rejected' );
					div.find( 'input[name="feedback_reason"]' ).prop( 'checked', false );
					div.find( 'textarea[name="feedback_comment"]' ).val( '' );
				}
			}
		);
	}

	function getReasonList( displayType ) {
		var rejectReasons = $gp_reject_feedback_settings.reject_reasons;

		var rejectList = '';
		var prefix = '';
		var suffix = '';
		var inputName = '';
		if ( displayType === 'single' ) {
			prefix = '<li><label>';
			suffix = '</label></li>';
			inputName = 'feedback_reason';
		} else {
			prefix = '<div class="modal-item"><label>';
			suffix = '</div></label>';
			inputName = 'modal_feedback_reason';
		}

		// eslint-disable-next-line vars-on-top
		for ( var reason in rejectReasons ) {
			rejectList += prefix + '<input type="checkbox" name="' + inputName + '" value="' + reason + '" />' + rejectReasons[ reason ] + suffix;
		}
		return rejectList;
	}
}( jQuery, $gp )
);
